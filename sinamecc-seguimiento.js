/*!
 * <sinamecc-seguimiento> \u2014 tablero p\u00fablico del m\u00f3dulo de seguimiento de pol\u00edticas del SINAMECC.
 *
 * Componente web sin dependencias. Lee los archivos est\u00e1ticos de datos abiertos
 * que publica el comando `policy_tracking_publish_open_data` (o la API p\u00fablica),
 * as\u00ed que no consulta la base de datos y sigue funcionando aunque el backend est\u00e9 ca\u00eddo.
 *
 * Uso m\u00ednimo, en cualquier p\u00e1gina del sitio:
 *
 *   <script src=".../sinamecc-seguimiento.js" defer></script>
 *   <sinamecc-seguimiento
 *       data-src="https://<bucket-o-dominio>/datos-abiertos/seguimiento-politicas/latest">
 *   </sinamecc-seguimiento>
 *
 * Atributos opcionales:
 *   instrument="ndc-2025-2035"  abre directamente un instrumento
 *   api="https://.../api/v1/policy-tracking/public"  usa la API p\u00fablica en lugar de los archivos
 *   hash-routing                 refleja la vista en el #fragmento de la URL (enlaces directos)
 *   downloads="false"            oculta los enlaces de descarga del pie
 *
 * Colores: se pueden cambiar con variables CSS desde la p\u00e1gina, por ejemplo
 *   sinamecc-seguimiento { --pt-accent: #00594f; --pt-font: "Montserrat", sans-serif; }
 *
 * Licencia: AGPL-3.0, como el resto de la plataforma SINAMECC.
 */
(function () {
  'use strict';

  if (window.customElements && window.customElements.get('sinamecc-seguimiento')) return;

  var STATUS = {
    on_track: { label: 'En tiempo', short: 'En tiempo' },
    at_risk: { label: 'En riesgo', short: 'En riesgo' },
    delayed: { label: 'Atrasado', short: 'Atrasado' },
    overdue: { label: 'Vencido sin reporte', short: 'Vencido' },
    no_data: { label: 'Por reportar', short: 'Por reportar' },
    no_target: { label: 'Sin meta', short: 'Sin meta' }
  };
  var STATUS_ORDER = ['on_track', 'at_risk', 'delayed', 'overdue', 'no_data', 'no_target'];
  var DIRECTION = { increase: 'Aumentar', decrease: 'Disminuir', maintain: 'Mantener' };

  var CSS = [
    ':host{--pt-accent:#0b6e4f;--pt-ink:#1f2933;--pt-muted:#52606d;--pt-line:#d9e2ec;--pt-bg:#ffffff;',
    '--pt-soft:#f5f7fa;--pt-good:#1b7f3b;--pt-warn:#b7791f;--pt-bad:#c53030;--pt-none:#8a96a3;',
    '--pt-font:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;--pt-radius:10px;',
    'display:block;font-family:var(--pt-font);color:var(--pt-ink);background:var(--pt-bg);line-height:1.45;font-size:15px}',
    '*{box-sizing:border-box}',
    '.wrap{max-width:1100px;margin:0 auto;padding:8px 0 24px}',
    'h2:focus{outline:none}h2{font-size:1.45em;margin:.2em 0 .3em;line-height:1.25}h3{font-size:1.1em;margin:1.2em 0 .5em}',
    'p{margin:.3em 0 .8em}a{color:var(--pt-accent)}',
    'button{font:inherit;cursor:pointer}',
    '.muted{color:var(--pt-muted)}.small{font-size:.86em}',
    '.back{display:block;background:none;border:0;color:var(--pt-accent);padding:4px 0;margin-bottom:6px;font-weight:600}',
    '.back:hover{text-decoration:underline}',
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}',
    '.card{border:1px solid var(--pt-line);border-radius:var(--pt-radius);padding:16px;background:var(--pt-bg);',
    'display:flex;flex-direction:column;gap:8px;text-align:left;color:inherit}',
    'button.card:hover,button.card:focus-visible{border-color:var(--pt-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--pt-accent) 25%,transparent)}',
    '.card .title{font-weight:700;font-size:1.05em}',
    '.kicker{font-size:.78em;text-transform:uppercase;letter-spacing:.04em;color:var(--pt-muted);font-weight:600}',
    '.bar{display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--pt-soft)}',
    '.bar span{display:block;height:100%}',
    '.s-on_track{background:var(--pt-good)}.s-at_risk{background:var(--pt-warn)}.s-delayed{background:var(--pt-bad)}.s-overdue{background:#7b341e}',
    '.s-no_data{background:var(--pt-none)}.s-no_target{background:var(--pt-line)}',
    '.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.86em;color:var(--pt-muted);margin:0;padding:0;list-style:none}',
    '.legend li{display:flex;align-items:center;gap:6px}',
    '.dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex:none}',
    '.chip{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 10px;font-size:.82em;',
    'font-weight:600;white-space:nowrap;border:1px solid transparent}',
    '.chip.on_track{background:#e6f4ea;color:#14532d}.chip.at_risk{background:#fdf3e1;color:#7a4b0b}.chip.overdue{background:#fbeee6;color:#7b341e;border-color:#e8c9b5}',
    '.chip.delayed{background:#fde8e8;color:#8b1c1c}.chip.no_data,.chip.no_target{background:var(--pt-soft);color:var(--pt-muted);border-color:var(--pt-line)}',
    '.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:12px 0 4px}',
    '.stat{border:1px solid var(--pt-line);border-radius:var(--pt-radius);padding:10px 12px}',
    '.stat b{display:block;font-size:1.6em;line-height:1.1}',
    '.toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0}',
    '.toolbar input,.toolbar select{font:inherit;padding:7px 10px;border:1px solid var(--pt-line);border-radius:8px;background:var(--pt-bg);color:inherit;min-width:0}',
    '.toolbar input{flex:1 1 220px}',
    '.toolbar label{display:flex;align-items:center;gap:6px;font-size:.9em;white-space:nowrap;flex:none}',
    '.node{border-left:3px solid var(--pt-line);margin:8px 0 8px 0;padding-left:12px}',
    '.node.depth0{border-left-color:var(--pt-accent)}',
    '.node-head{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;justify-content:space-between;background:none;border:0;width:100%;padding:4px 0;text-align:left;color:inherit}',
    '.node-head .name{font-weight:600;flex:1 1 300px}',
    '.node-head .code{color:var(--pt-muted);font-variant-numeric:tabular-nums;margin-right:6px;font-weight:600}',
    '.caret{display:inline-block;width:1em;color:var(--pt-muted);transition:transform .15s}',
    '.open>.node-head .caret{transform:rotate(90deg)}',
    '.node-body{display:none}.open>.node-body{display:block}',
    '.ind{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;padding:10px 12px;margin:6px 0;',
    'border:1px solid var(--pt-line);border-radius:8px;background:var(--pt-bg);width:100%;text-align:left;color:inherit}',
    '.ind:hover,.ind:focus-visible{border-color:var(--pt-accent)}',
    '.ind .name{font-weight:600}.ind .meta{grid-column:1/-1;font-size:.86em;color:var(--pt-muted)}',
    '.meter{grid-column:1/-1;height:6px;background:var(--pt-soft);border-radius:3px;overflow:hidden}',
    '.meter span{display:block;height:100%}',
    'table{border-collapse:collapse;width:100%;font-size:.92em;margin:8px 0}',
    'th,td{border-bottom:1px solid var(--pt-line);padding:6px 8px;text-align:left;vertical-align:top}',
    'th{font-weight:600;color:var(--pt-muted)}.num{text-align:right;font-variant-numeric:tabular-nums}',
    'dl{display:grid;grid-template-columns:minmax(140px,max-content) 1fr;gap:6px 16px;margin:8px 0}',
    'dt{color:var(--pt-muted)}dd{margin:0}',
    '.chart{width:100%;height:auto;max-height:320px;margin:6px 0}',
    '.notice{background:var(--pt-soft);border:1px solid var(--pt-line);border-radius:8px;padding:10px 12px;margin:10px 0}',
    '.downloads{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:.9em;margin-top:6px}',
    'footer{margin-top:24px;padding-top:12px;border-top:1px solid var(--pt-line);font-size:.86em;color:var(--pt-muted)}',
    '.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.loading{padding:24px 0;color:var(--pt-muted)}',
    '.ind .chip,.node-head .chip{justify-self:start}',
    '.table-scroll{overflow-x:auto}',
    '.detail{margin:4px 0 10px;max-width:80ch}.detail .desc{margin:2px 0 6px}',
    '.facts{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;margin:0 0 6px}',
    '.tag{display:inline-block;border:1px solid var(--pt-line);border-radius:4px;padding:0 6px;font-weight:600;font-size:.92em;background:var(--pt-soft)}',
    '.milestones{border:1px solid var(--pt-line);border-radius:8px;padding:8px 12px;margin:6px 0;background:var(--pt-soft)}',
    '.ms{display:grid;grid-template-columns:3.2em 1fr;gap:8px;margin-top:6px}',
    '.ms-year{font-weight:700;color:var(--pt-accent);font-variant-numeric:tabular-nums}',
    '.ms ul{margin:0;padding-left:1.1em}.ms li{margin:2px 0}',
    'ul.plain{margin:6px 0 0;padding-left:1.1em}ul.plain li{margin:2px 0}',
    '.acts{margin:6px 0}.acts summary{cursor:pointer;color:var(--pt-accent);font-weight:600;font-size:.92em}',
    '.chartbox{position:relative}',
    '.hero{border:1px solid var(--pt-line);border-left:4px solid var(--pt-accent);border-radius:var(--pt-radius);padding:14px 16px;margin:12px 0;background:var(--pt-soft)}',
    '.hero-title{font-weight:700;font-size:1.1em;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0}',
    '.why{margin:6px 0 10px;max-width:80ch}',
    '.tag.warn{background:#fdf3e1;border-color:#f0d7a7;color:#7a4b0b}.tag.draft{background:#eef0ff;border-color:#c9cdf5;color:#3b3f8f}',
    '.btn-row{display:flex;flex-wrap:wrap;gap:8px}',
    '.gloss dt{font-weight:700;color:var(--pt-ink)}',
    '.quote{margin:12px 0;padding:10px 14px;border-left:4px solid var(--pt-line);background:var(--pt-soft);border-radius:6px}.quote footer{margin-top:6px}',
    'code{font-size:.92em}',
    '.srcs{list-style:none;margin:8px 0;padding:0;display:grid;gap:10px}',
    '.src{border:1px solid var(--pt-line);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;min-width:0;overflow-wrap:anywhere}',
    '.src p{margin:2px 0}.src-head{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between}','.nowrap{white-space:nowrap}','.rec-code{width:9em;max-width:9em;overflow-wrap:anywhere}.rec-code code{white-space:normal}',
    '.pubs{list-style:none;margin:8px 0 6px;padding:0;display:grid;gap:8px}',
    '.pubs li{display:flex;gap:12px;align-items:center;border:1px solid var(--pt-line);border-radius:8px;padding:10px 12px}',
    '.pdf{flex:none;width:40px;height:48px;border-radius:4px;background:#c53030;color:#fff;font-weight:700;font-size:.72em;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;letter-spacing:.04em}',
    '.pdf.doc{background:#2a5d9f}.pdf.data{background:var(--pt-accent)}',
    '.pub-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.pub-title{font-weight:600}',
    '.btn{flex:none;display:inline-block;background:var(--pt-accent);color:#fff;text-decoration:none;font-weight:600;font-size:.88em;border-radius:6px;padding:7px 12px;border:1px solid var(--pt-accent)}',
    '.btn:hover{filter:brightness(1.1)}.btn.ghost{background:transparent;color:var(--pt-accent)}',
    '.method{border-left:3px solid var(--pt-accent);padding:2px 0 2px 12px;max-width:80ch}',
    '@media (max-width:560px){.pubs li{flex-wrap:wrap}.pub-text{flex:1 1 calc(100% - 56px)}.pubs .btn{margin-left:52px}}',
    '.tip{position:absolute;top:8px;pointer-events:none;background:var(--pt-bg);border:1px solid var(--pt-line);border-radius:8px;',
    'padding:8px 10px;font-size:.82em;box-shadow:0 4px 14px rgba(15,23,42,.12);min-width:180px;max-width:280px;z-index:2}',
    '.tip b{display:block;margin-bottom:4px}.tip div{display:flex;gap:6px;align-items:center;justify-content:space-between}',
    '.tip i{width:10px;height:3px;border-radius:2px;display:inline-block;flex:none}.tip span{flex:1}',
    '.swatch{width:16px;height:3px;border-radius:2px;display:inline-block;flex:none}',
    '.chart-legend{margin-bottom:8px}',
    '.headline{border:1px solid var(--pt-line);border-radius:var(--pt-radius);padding:14px 16px;margin:14px 0}',
    '.headline .top{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;justify-content:space-between}',
    '.headline .title{font-weight:700;font-size:1.05em}',
    '.figures{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:10px 0}',
    '.figures div{background:var(--pt-soft);border-radius:8px;padding:8px 10px}',
    '.figures b{display:block;font-size:1.25em;font-variant-numeric:tabular-nums}',
    '.coverage{font-size:.9em;margin:10px 0 0}',
    '.link{background:none;border:0;padding:0;color:var(--pt-accent);font-weight:600;text-decoration:underline}',
    '@media (max-width:560px){dl{grid-template-columns:1fr}dt{margin-top:6px}.ind{grid-template-columns:1fr}}'
  ].join('');

  // -------------------------------------------------------------------------------- helpers
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(value, digits) {
    if (value === null || value === undefined || value === '') return '\u2014';
    var n = Number(value);
    if (!isFinite(n)) return esc(value);
    var opts = { maximumFractionDigits: digits == null ? (Math.abs(n) < 10 ? 3 : 1) : digits };
    return n.toLocaleString('es-CR', opts);
  }
  function chip(status, extra) {
    var s = STATUS[status] || STATUS.no_data;
    return '<span class="chip ' + esc(status) + '"><span class="dot s-' + esc(status) + '" aria-hidden="true"></span>' +
      esc(s.label) + (extra ? ' \u00b7 ' + esc(extra) : '') + '</span>';
  }
  function stackedBar(counts, label) {
    var total = 0;
    STATUS_ORDER.forEach(function (k) { total += counts[k] || 0; });
    if (!total) return '<div class="bar" role="img" aria-label="Sin indicadores"></div>';
    var parts = STATUS_ORDER.filter(function (k) { return counts[k]; }).map(function (k) {
      return '<span class="s-' + k + '" style="width:' + (100 * counts[k] / total).toFixed(2) + '%"></span>';
    }).join('');
    var text = STATUS_ORDER.filter(function (k) { return counts[k]; }).map(function (k) {
      return counts[k] + ' ' + STATUS[k].label.toLowerCase();
    }).join(', ');
    return '<div class="bar" role="img" aria-label="' + esc((label || 'Indicadores') + ': ' + text) + '">' + parts + '</div>';
  }
  function legend() {
    return '<ul class="legend" aria-label="Leyenda">' + STATUS_ORDER.map(function (k) {
      return '<li><span class="dot s-' + k + '" aria-hidden="true"></span>' + STATUS[k].label + '</li>';
    }).join('') + '</ul>';
  }
  function meter(progress, status) {
    if (progress == null) return '';
    var width = Math.max(0, Math.min(100, progress));
    return '<div class="meter" aria-hidden="true"><span class="s-' + esc(status) + '" style="width:' + width + '%"></span></div>';
  }
  function dateText(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    var d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Line chart (inline SVG): accepted values, the expected path from the baseline to the
  // targets, and the reference series (scenarios, estimates) of the indicator.
  var SERIES_COLORS = ['#2a78d6', '#eb6834', '#6250d6'];
  var ESTIMATE = /estimaci/i;

  function pct(progress) {
    if (progress == null) return '';
    return progress < 0 ? 'se aleja de la meta' : fmt(progress, 0) + ' %';
  }

  function chart(detail, registry) {
    var values = (detail.values || []).filter(function (v) {
      return !v.period_label && (!v.disaggregation || Object.keys(v.disaggregation).length === 0) && v.value != null;
    }).map(function (v) { return { x: v.year, y: Number(v.value), estimate: ESTIMATE.test(v.note || '') }; });
    var targets = (detail.targets || []).map(function (t) { return { x: t.year, y: Number(t.value) }; });
    var base = detail.baseline && detail.baseline.value != null && detail.baseline.year != null
      ? { x: detail.baseline.year, y: Number(detail.baseline.value) } : null;
    var refs = (detail.reference_series || []).map(function (r) {
      return { name: r.name, kind: r.kind, points: (r.points || []).map(function (p) { return { x: p.year, y: Number(p.value) }; }) };
    });
    // Long inventory series (from 1990) would flatten the years that matter: the chart starts
    // 20 years before the first target and the full series stays in the table.
    var firstTarget = targets.length ? Math.min.apply(null, targets.map(function (p) { return p.x; })) : null;
    var clipFrom = firstTarget != null ? firstTarget - 20 : null;
    var clipped = clipFrom != null && values.some(function (p) { return p.x < clipFrom; });
    if (clipFrom != null) {
      var keep = function (p) { return p.x >= clipFrom; };
      values = values.filter(keep);
      refs.forEach(function (r) { r.points = r.points.filter(keep); });
      if (base && base.x < clipFrom) base = null;
    }
    var all = values.concat(targets).concat(base ? [base] : []);
    refs.forEach(function (r) { all = all.concat(r.points); });
    if (all.length < 2) return '';
    var W = 640, H = 280, L = 64, R = 64, T = 16, B = 34;
    var xs = all.map(function (p) { return p.x; }), ys = all.map(function (p) { return p.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (x0 === x1) { x0 -= 1; x1 += 1; }
    var pad = (y1 - y0) * 0.12 || Math.abs(y1) * 0.1 || 1;
    y0 -= pad; y1 += pad;
    if (y0 > 0 && Math.min.apply(null, ys) - pad < 0) y0 = 0;
    function X(v) { return L + (v - x0) / (x1 - x0) * (W - L - R); }
    function Y(v) { return T + (1 - (v - y0) / (y1 - y0)) * (H - T - B); }
    function path(points) {
      return points.slice().sort(function (a, b) { return a.x - b.x; }).map(function (p, i) {
        return (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1);
      }).join('');
    }
    var ticks = '', step = Math.max(1, Math.ceil((x1 - x0) / 8));
    for (var yr = Math.ceil(x0); yr <= x1; yr += step) {
      ticks += '<line x1="' + X(yr) + '" x2="' + X(yr) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="#eef1f4"/>' +
        '<text x="' + X(yr) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="12" fill="#52606d">' + yr + '</text>';
    }
    var yt = '';
    var rough = (y1 - y0) / 4, mag = Math.pow(10, Math.floor(Math.log(rough) / Math.LN10));
    var ystep = [1, 2, 2.5, 5, 10].map(function (k) { return k * mag; }).filter(function (k) { return k >= rough; })[0] || rough;
    var digits = ystep >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log(ystep) / Math.LN10));
    for (var v = Math.ceil(y0 / ystep) * ystep; v <= y1 + 1e-9; v += ystep) {
      yt += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#f1f3f5"/>' +
        '<text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="12" fill="#52606d">' + fmt(v, digits) + '</text>';
    }
    var hover = [];  // series shown in the tooltip, in legend order
    var legendItems = [];
    var svg = '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="#9aa5b1"/>';
    var scenarioIndex = 0;
    refs.forEach(function (r) {
      if (!r.points.length) return;
      var color, dash = '';
      if (r.kind === 'scenario') {
        color = SERIES_COLORS[scenarioIndex % SERIES_COLORS.length];
        scenarioIndex += 1;
      } else {
        color = '#8a96a3'; dash = ' stroke-dasharray="2 4" stroke-linecap="round"';
      }
      svg += '<path d="' + path(r.points) + '" fill="none" stroke="' + color + '" stroke-width="2"' + dash + '/>';
      if (r.kind === 'scenario') {
        var last = r.points[r.points.length - 1];
        svg += '<circle cx="' + X(last.x) + '" cy="' + Y(last.y) + '" r="3.5" fill="' + color + '" stroke="#fff" stroke-width="2"/>' +
          '<text x="' + (X(last.x) + 7) + '" y="' + (Y(last.y) + 4) + '" font-size="12" fill="#1f2933">' + fmt(last.y, 0) + '</text>';
      }
      legendItems.push('<li><span class="swatch" style="background:' + color + (dash ? ';background:repeating-linear-gradient(90deg,' + color + ' 0 3px,transparent 3px 6px)' : '') + '"></span>' + esc(r.name) + '</li>');
      hover.push({ name: r.name, color: color, points: r.points });
    });
    var targetLine = base ? [base].concat(targets) : targets;
    if (targetLine.length > 1) {
      svg += '<path d="' + path(targetLine) + '" fill="none" stroke="#52606d" stroke-width="2" stroke-dasharray="6 5"/>';
    }
    targets.forEach(function (p) {
      svg += '<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="5" fill="#fff" stroke="#52606d" stroke-width="2"/>';
    });
    if (targets.length) {
      var t = targets[targets.length - 1];
      svg += '<text x="' + (X(t.x) + 8) + '" y="' + (Y(t.y) - 8) + '" font-size="12" font-weight="600" fill="#1f2933">Meta ' + t.x + '</text>';
    }
    if (base) {
      svg += '<rect x="' + (X(base.x) - 4.5) + '" y="' + (Y(base.y) - 4.5) + '" width="9" height="9" fill="#52606d" stroke="#fff" stroke-width="2"/>';
    }
    if (values.length > 1) {
      svg += '<path d="' + path(values) + '" fill="none" stroke="var(--pt-accent)" stroke-width="3"/>';
    }
    values.forEach(function (p) {
      svg += p.estimate
        ? '<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="5" fill="#fff" stroke="var(--pt-accent)" stroke-width="3"/>'
        : '<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="5" fill="var(--pt-accent)" stroke="#fff" stroke-width="2"/>';
    });
    if (values.length) {
      var lastValue = values.slice().sort(function (a, b) { return a.x - b.x; })[values.length - 1];
      var nearEdge = X(lastValue.x) < L + 40;
      svg += '<text x="' + (X(lastValue.x) + (nearEdge ? 8 : 0)) + '" y="' + (Y(lastValue.y) - 11) + '" text-anchor="' + (nearEdge ? 'start' : 'middle') + '" font-size="12" font-weight="700" fill="#1f2933">' + fmt(lastValue.y) + '</text>';
    }
    var id = registry.length;
    registry.push({
      W: W, L: L, R: R, x0: x0, x1: x1, unit: detail.unit || '',
      series: [{ name: 'Valor aceptado', color: 'var(--pt-accent)', points: values }]
        .concat(targetLine.length ? [{ name: 'Trayectoria esperada a la meta', color: '#52606d', points: targetLine, interpolate: true }] : [])
        .concat(hover)
    });
    var legend = '<ul class="legend chart-legend">' +
      (values.length ? '<li><span class="dot" style="background:var(--pt-accent)"></span>Valor aceptado</li>' : '') +
      (values.some(function (p) { return p.estimate; }) ? '<li><span class="dot" style="background:#fff;border:3px solid var(--pt-accent)"></span>Estimaci\u00f3n preliminar</li>' : '') +
      (base ? '<li><span class="dot" style="background:#52606d;border-radius:1px"></span>L\u00ednea base</li>' : '') +
      (targets.length ? '<li><span class="dot" style="background:#fff;border:2px solid #52606d"></span>Meta (punteada: trayectoria esperada desde la l\u00ednea base)</li>' : '') +
      legendItems.join('') + '</ul>';
    return '<div class="chartbox"><svg class="chart" data-chart="' + id + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
      esc('Evoluci\u00f3n de ' + detail.name + ': valores, metas y trayectorias de referencia. Los datos est\u00e1n en las tablas de la ficha.') + '">' +
      ticks + yt + svg + '<line class="cross" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="#1f2933" stroke-width="1" visibility="hidden"/>' +
      '</svg><div class="tip" hidden></div></div>' + legend +
      (clipped ? '<p class="small muted">El gr\u00e1fico empieza en ' + clipFrom + '; la serie completa est\u00e1 en la tabla de valores.</p>' : '');
  }

  function valueAt(series, year) {
    var pts = series.points.slice().sort(function (a, b) { return a.x - b.x; });
    for (var i = 0; i < pts.length; i++) if (pts[i].x === year) return pts[i].y;
    if (!series.interpolate) return null;
    for (var j = 1; j < pts.length; j++) {
      if (pts[j - 1].x < year && pts[j].x > year) {
        return pts[j - 1].y + (pts[j].y - pts[j - 1].y) * (year - pts[j - 1].x) / (pts[j].x - pts[j - 1].x);
      }
    }
    return null;
  }

  function baselineText(b) {
    b = b || {};
    var text = b.value != null ? fmt(b.value) + ' (' + esc(b.year) + ')' : (b.note ? '' : '\u2014');
    if (b.source) text += (text ? '<br>' : '') + '<span class="small muted">Fuente: ' + esc(b.source) + '</span>';
    if (b.note) text += (text ? '<br>' : '') + '<span class="small">' + esc(b.note) + '</span>';
    return text;
  }

  function seriesTable(series) {
    if (!series.length) return '';
    var years = {};
    series.forEach(function (s) { (s.points || []).forEach(function (p) { years[p.year] = true; }); });
    var cols = Object.keys(years).map(Number).sort(function (a, b) { return a - b; });
    var head = '<tr><th scope="col">A\u00f1o</th>' + series.map(function (s) {
      return '<th scope="col" class="num">' + esc(s.name) + '</th>';
    }).join('') + '</tr>';
    var body = cols.map(function (y) {
      return '<tr><td>' + y + '</td>' + series.map(function (s) {
        var p = (s.points || []).filter(function (q) { return q.year === y; })[0];
        return '<td class="num">' + (p ? fmt(p.value) : '') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var sources = {};
    series.forEach(function (s) { if (s.source) sources[s.source] = true; });
    return '<h3>Trayectorias de referencia</h3><p class="small muted">Escenarios y estimaciones publicados en documentos oficiales. ' +
      'Se dibujan como contexto: no son datos reportados ni cuentan para el avance.</p>' +
      '<details class="acts"><summary>Ver la tabla (' + series.length + ' series)</summary><div class="table-scroll"><table><thead>' +
      head + '</thead><tbody>' + body + '</tbody></table></div></details>' +
      Object.keys(sources).map(function (src) { return '<p class="small muted">Fuente: ' + esc(src) + '</p>'; }).join('');
  }

  function lineFor(indicator) {
    var ip = indicator.progress || {};
    var parts = [];
    var b = indicator.baseline || {};
    if (b.value != null) parts.push('Base ' + esc(b.year) + ': ' + fmt(b.value));
    else if (b.note && /^por definir/i.test(b.note)) parts.push('L\u00ednea de base por definir');
    if (ip.year && !(b.year != null && ip.year <= b.year)) {
      parts.push('\u00daltimo dato ' + ip.year + ': <strong>' + fmt(ip.actual) + '</strong>' +
        (ip.target != null ? ' (esperado: ' + fmt(ip.target) + ')' : ''));
    } else if (!ip.year) {
      parts.push('Sin dato reportado');
    }
    var targets = indicator.targets || [];
    if (targets.length) {
      var t = targets[targets.length - 1];
      parts.push('Meta ' + esc(t.year) + ': <strong>' + fmt(t.value) + '</strong>');
    }
    return parts.join(' \u00b7 ') + ' ' + esc(indicator.unit);
  }

  // One sentence that says why the traffic light has its colour (the evidence asks for it).
  function explain(ind) {
    var p = ind.progress || {}, unit = ind.unit ? ' ' + esc(ind.unit) : '';
    var targets = (ind.targets || []).slice().sort(function (a, b) { return a.year - b.year; });
    var last = targets.length ? targets[targets.length - 1] : null;
    var b = ind.baseline || {};
    var now = new Date().getFullYear();
    if (p.status === 'no_target') return 'El documento que crea este indicador no le fija una meta num\u00e9rica.';
    if (p.status === 'overdue') {
      var due = targets.filter(function (t) { return t.year < now; });
      return 'La meta de ' + esc(due.length ? due[due.length - 1].year : '') + ' ya venci\u00f3 y la instituci\u00f3n responsable todav\u00eda no ha reportado el dato.';
    }
    if (p.status === 'no_data') {
      var next = targets.filter(function (t) { return !p.year || t.year > p.year; })[0];
      if (p.year && b.year != null && p.year <= b.year) {
        return 'Solo se conoce la l\u00ednea base (' + fmt(b.value) + unit + ' en ' + esc(b.year) + '). El primer avance se mide con la meta de ' + esc(next ? next.year : '') + '.';
      }
      return 'Todav\u00eda no hay datos reportados' + (next ? '; la primera meta es para ' + esc(next.year) + ' (' + fmt(next.value) + unit + ')' : '') + '.';
    }
    if (!p.year) return '';
    var estimate = p.is_estimate ? ', una estimaci\u00f3n preliminar y no un dato del inventario' : '';
    var text = 'En ' + p.year + ' el valor fue ' + fmt(p.actual) + unit + estimate + '. ';
    if (p.target != null) text += 'Para ir en camino' + (last ? ' a la meta de ' + fmt(last.value) + ' en ' + esc(last.year) : '') + ' se esperaba ' + fmt(p.target) + '. ';
    if (p.progress_percent != null) {
      text += p.progress_percent < 0 ? 'El valor se movi\u00f3 en sentido contrario a la meta.' : 'Lleva ' + fmt(p.progress_percent, 0) + ' % de lo esperado para ese a\u00f1o.';
    }
    return text;
  }

  function termBadge(i) {
    if (i.term_status === 'ended') return '<span class="tag warn">Vigencia terminada en ' + esc(i.end_year) + '</span>';
    if (i.term_status === 'ending') return '<span class="tag warn">Su vigencia termina en ' + esc(i.end_year) + '</span>';
    return '';
  }

  var GLOSSARY = [
    ['BAU', 'Escenario tendencial o \u00absin CND\u00bb: lo que pasar\u00eda con las emisiones sin las medidas adicionales.'],
    ['BTR', 'Informe Bienal de Transparencia que Costa Rica entrega a la Convenci\u00f3n Marco de las Naciones Unidas sobre el Cambio Clim\u00e1tico.'],
    ['CND (NDC)', 'Contribuci\u00f3n Nacionalmente Determinada: las metas clim\u00e1ticas que el pa\u00eds asume ante el Acuerdo de Par\u00eds.'],
    ['CRT', 'Tablas comunes de reporte del inventario, que acompa\u00f1an al BTR.'],
    ['Escenario', 'Trayectoria calculada con un modelo; se muestra como contexto y no cuenta para el avance.'],
    ['Estimaci\u00f3n preliminar', 'Cifra calculada antes de que exista el dato oficial del inventario; se reemplaza cuando el IMN lo publica.'],
    ['Gg CO\u2082e', 'Gigagramos de di\u00f3xido de carbono equivalente: miles de toneladas de gases de efecto invernadero expresadas como CO\u2082.'],
    ['INGEI', 'Inventario Nacional de Gases de Efecto Invernadero, que prepara el IMN.'],
    ['L\u00ednea base', 'Valor del indicador al inicio, contra el que se mide el avance.'],
    ['Meta', 'Valor que el instrumento se compromete a alcanzar en un a\u00f1o.'],
    ['NAP', 'Plan Nacional de Adaptaci\u00f3n al Cambio Clim\u00e1tico.'],
    ['PGCC', 'Plan de Acci\u00f3n Nacional sobre Igualdad de G\u00e9nero en la Acci\u00f3n por el Clima.'],
    ['PNDIP', 'Plan Nacional de Desarrollo y de Inversi\u00f3n P\u00fablica.'],
    ['Por reportar', 'El indicador tiene meta pero todav\u00eda no le toca reportar o no hay dato.'],
    ['Trayectoria esperada', 'L\u00ednea entre la l\u00ednea base y las metas: indica cu\u00e1nto se esperaba en cada a\u00f1o.'],
    ['UTCUTS (FOLU)', 'Uso de la tierra, cambio de uso de la tierra y silvicultura: bosques, suelos y su captura o emisi\u00f3n de carbono.'],
    ['Vencido sin reporte', 'El a\u00f1o de la meta ya pas\u00f3 y no hay dato reportado.']
  ];

  function slug(text) {
    return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // -------------------------------------------------------------------------------- element
  function SinameccSeguimiento() {
    return Reflect.construct(HTMLElement, [], SinameccSeguimiento);
  }
  SinameccSeguimiento.prototype = Object.create(HTMLElement.prototype);
  SinameccSeguimiento.prototype.constructor = SinameccSeguimiento;
  Object.setPrototypeOf(SinameccSeguimiento, HTMLElement);

  SinameccSeguimiento.prototype.connectedCallback = function () {
    if (this._ready) return;
    this._ready = true;
    this._root = this.attachShadow({ mode: 'open' });
    this._cache = {};
    this._filters = { q: '', status: '', gender: false };
    this._root.innerHTML = '<style>' + CSS + '</style><div class="wrap" aria-live="polite"><p class="loading">Cargando\u2026</p></div>';
    this._wrap = this._root.querySelector('.wrap');
    var self = this;
    this._root.addEventListener('click', function (e) { self._onClick(e); });
    this._root.addEventListener('input', function (e) { self._onInput(e); });
    this._root.addEventListener('change', function (e) { self._onInput(e); });
    this._root.addEventListener('mousemove', function (e) { self._onHover(e); });
    this._root.addEventListener('mouseleave', function () { self._hideTips(); }, true);
    if (this.hasAttribute('hash-routing')) {
      window.addEventListener('hashchange', function () { self._route(); });
    }
    this._route();
  };

  SinameccSeguimiento.prototype._base = function () {
    return (this.getAttribute('data-src') || '').replace(/\/$/, '');
  };

  SinameccSeguimiento.prototype._url = function (kind, code) {
    var api = (this.getAttribute('api') || '').replace(/\/$/, '');
    var staticKinds = { sources: 'fuentes.json', recs: 'recomendaciones.json', atlas: 'atlas_cantonal_2026.json' };
    if (api && !staticKinds[kind]) {
      if (kind === 'index') return api + '/instruments/';
      if (kind === 'instrument') return api + '/instruments/' + encodeURIComponent(code) + '/';
      return api + '/indicators/' + encodeURIComponent(code) + '/';
    }
    var base = this._base();
    if (staticKinds[kind]) return base + '/' + staticKinds[kind];
    if (kind === 'index') return base + '/indice.json';
    if (kind === 'instrument') return base + '/instrumentos/' + encodeURIComponent(code) + '.json';
    return base + '/indicadores/' + encodeURIComponent(code) + '.json';
  };

  SinameccSeguimiento.prototype._get = function (kind, code) {
    var url = this._url(kind, code);
    if (this._cache[url]) return this._cache[url];
    // Offline copy: a page can embed the files in window.SINAMECC_SEGUIMIENTO_DATA,
    // keyed by path inside data-src (e.g. "indice.json"), so it opens with a double click.
    var inline = window.SINAMECC_SEGUIMIENTO_DATA;
    var key = url.indexOf(this._base() + '/') === 0 ? url.slice(this._base().length + 1) : url;
    if (inline && inline[key]) {
      this._cache[url] = Promise.resolve(inline[key]);
      return this._cache[url];
    }
    var promise = fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      // The API returns a bare list for the index; the static file wraps it.
      if (Array.isArray(data)) return { instrumentos: data };
      return data;
    });
    this._cache[url] = promise;
    promise.catch(function () { delete this._cache[url]; }.bind(this));
    return promise;
  };

  SinameccSeguimiento.prototype._state = function () {
    if (this.hasAttribute('hash-routing')) {
      var m = /^#seguimiento(?:\/([\w-]+))?(?:\/([\w-]+))?/.exec(window.location.hash || '');
      if (m) return { instrument: m[1] || null, indicator: m[2] || null };
    }
    return this._view || { instrument: this.getAttribute('instrument'), indicator: null };
  };

  SinameccSeguimiento.prototype._go = function (instrument, indicator) {
    this._view = { instrument: instrument || null, indicator: indicator || null };
    if (this.hasAttribute('hash-routing')) {
      var hash = '#seguimiento' + (instrument ? '/' + instrument : '') + (indicator ? '/' + indicator : '');
      if (window.location.hash !== hash) { window.location.hash = hash; return; }
    }
    this._route();
  };

  SinameccSeguimiento.prototype._route = function () {
    var state = this._state(), self = this;
    this._charts = [];
    var token = {};
    this._token = token;
    var done = function (html) {
      if (self._token !== token) return;
      self._wrap.innerHTML = html + self._footer();
      self._chartsShown = self._charts;
      var heading = self._wrap.querySelector('h2');
      if (heading && self._focusNext) { heading.setAttribute('tabindex', '-1'); heading.focus(); }
      self._focusNext = false;
    };
    var fail = function (err) {
      if (self._token !== token) return;
      self._wrap.innerHTML = '<div class="notice" role="alert"><strong>No se pudieron cargar los datos.</strong> ' +
        'Intente de nuevo m\u00e1s tarde. <span class="muted small">(' + esc(err && err.message) + ')</span></div>';
    };
    if (state.instrument === 'canton' && state.indicator) {
      this._cantonSlug = state.indicator;
      state = { instrument: 'canton', indicator: null };
    }
    if (state.indicator) {
      this._get('indicator', state.indicator).then(function (d) { done(self._renderIndicator(d, state)); }, fail);
    } else if (state.instrument === 'glosario') {
      done(self._renderGlossary());
    } else if (state.instrument === 'recomendaciones') {
      Promise.all([this._get('recs'), this._get('index').catch(function () { return {}; })]).then(function (r) {
        self._index = r[1]; done(self._renderRecommendations(r[0], r[1]));
      }, fail);
    } else if (state.instrument === 'canton') {
      Promise.all([this._get('atlas'), this._get('index').catch(function () { return {}; })]).then(function (r) {
        self._index = r[1]; self._atlas = r[0]; done(self._renderCanton(r[0], self._cantonSlug || null));
      }, fail);
    } else if (state.instrument === 'fuentes') {
      Promise.all([this._get('sources'), this._get('index').catch(function () { return {}; })]).then(function (r) {
        self._index = r[1]; done(self._renderSources(r[0], r[1]));
      }, fail);
    } else if (state.instrument) {
      this._get('instrument', state.instrument).then(function (d) {
        self._tree = d; done(self._renderInstrument(d));
      }, fail);
    } else {
      this._get('index').then(function (d) { self._index = d; done(self._renderIndex(d)); }, fail);
    }
  };

  // ------------------------------------------------------------------------- views
  SinameccSeguimiento.prototype._renderIndex = function (data) {
    var items = (data.instrumentos || []).map(function (i) {
      var period = i.start_year ? (i.start_year + (i.end_year ? '\u2013' + i.end_year : '')) : '';
      return '<button type="button" class="card" data-go-instrument="' + esc(i.code) + '">' +
        '<span class="kicker">' + esc(i.instrument_type_label) + (period ? ' \u00b7 ' + esc(period) : '') + '</span>' +
        '<span class="title">' + esc(i.short_name) + '</span>' +
        '<span class="muted small">' + esc(i.name) + '</span>' + termBadge(i) +
        stackedBar(i.indicator_status_counts, i.short_name) +
        (i.coverage && i.indicator_count ? '<span class="small muted">' + i.coverage.with_values + ' con datos \u00b7 ' +
          i.coverage.with_target + ' con meta \u00b7 ' + i.coverage.with_baseline + ' con l\u00ednea de base</span>' : '') +
        '<span class="small">' + i.indicator_count + ' indicador' + (i.indicator_count === 1 ? '' : 'es') +
        ' \u00b7 Rector\u00eda: ' + esc(i.lead_institution) + '</span></button>';
    }).join('');
    var reports = (data.publicaciones || []).filter(function (p) { return p.kind === 'dossier'; });
    var downloads = this.getAttribute('downloads') !== 'false';
    var totals = { all: 0, values: 0 }, sum = {};
    (data.instrumentos || []).forEach(function (i) {
      totals.all += i.indicator_count || 0;
      totals.values += (i.coverage && i.coverage.with_values) || 0;
      Object.keys(i.indicator_status_counts || {}).forEach(function (k) { sum[k] = (sum[k] || 0) + i.indicator_status_counts[k]; });
    });
    var ndc = (data.instrumentos || []).filter(function (i) { return i.instrument_type === 'ndc'; })[0];
    var main = ndc && (ndc.headline || [])[0];
    var hero = main ? '<section class="hero" aria-label="Respuesta corta"><span class="kicker">\u00bfVamos bien?</span>' +
      '<p class="hero-title">' + esc(main.name) + ' ' + chip(main.progress.status, pct(main.progress.progress_percent)) + '</p>' +
      '<p>' + explain(main) + '</p>' +
      '<p class="small muted">En total se siguen ' + fmt(totals.all, 0) + ' indicadores en ' + (data.instrumentos || []).length +
      ' instrumentos; ' + fmt(totals.values, 0) + ' tienen datos aceptados, ' + fmt(sum.overdue || 0, 0) + ' tienen la meta vencida sin reporte y ' +
      fmt(sum.no_data || 0, 0) + ' est\u00e1n por reportar. <button type="button" class="link" data-go-instrument="' + esc(ndc.code) + '">Ver la CND</button></p></section>' : '';
    return '<h2>Seguimiento de pol\u00edticas clim\u00e1ticas</h2>' +
      '<p class="muted">Avance de los instrumentos de pol\u00edtica clim\u00e1tica de Costa Rica, con los datos reportados por las ' +
      'instituciones y validados por la Direcci\u00f3n de Cambio Clim\u00e1tico.</p>' + hero + legend() +
      '<div class="grid" style="margin-top:14px">' + (items || '<p class="muted">A\u00fan no hay instrumentos publicados.</p>') + '</div>' +
      (downloads && reports.length ? '<h3 id="publicaciones">Publicaciones</h3><p class="small muted">Un dossier de dos p\u00e1ginas por instrumento para quien decide, ' +
        'generado con los mismos datos de este tablero cada vez que se publican. El informe de seguimiento completo est\u00e1 en la p\u00e1gina de cada instrumento.</p>' + this._pubList(reports) : '') +
      (downloads ? '<h3>Documentos oficiales</h3>' + this._docList(data.instrumentos) : '') +
      (downloads && this._base() ? '<h3>Datos abiertos</h3><p class="small muted">Archivos para descargar y reutilizar; se actualizan con cada publicaci\u00f3n.</p>' +
        this._dataList() : '') +
      '<h3>Fuentes de informaci\u00f3n</h3><p class="small muted">Los documentos oficiales y archivos de trabajo con que se aliment\u00f3 este tablero, qu\u00e9 se tom\u00f3 de cada uno y qu\u00e9 documentos faltan.</p>' +
      '<p class="btn-row"><button type="button" class="btn" data-go-instrument="fuentes">Ver las fuentes de informaci\u00f3n</button>' +
      '<button type="button" class="btn ghost" data-go-instrument="recomendaciones">Recomendaciones y mejoras</button>' +
      '<button type="button" class="btn ghost" data-go-instrument="canton">Mi cant\u00f3n</button>' +
      '<button type="button" class="btn ghost" data-go-instrument="glosario">Glosario</button></p>' +
      '<h3>C\u00f3mo leer este tablero</h3><div class="method small">' +
      '<p><strong>De d\u00f3nde vienen los datos.</strong> Cada instituci\u00f3n responsable reporta sus indicadores con evidencia; la ' +
      'Direcci\u00f3n de Cambio Clim\u00e1tico los revisa y solo los aceptados se publican aqu\u00ed. Cada valor indica su fuente.</p>' +
      '<p><strong>C\u00f3mo se calcula el avance.</strong> El \u00faltimo dato se compara con el valor esperado para ese a\u00f1o, ' +
      'calculado entre la l\u00ednea de base y las metas. Los rangos son los de MIDEPLAN.</p>' +
      '<p><strong>Escenarios.</strong> Las trayectorias de los planes se muestran como contexto; no cuentan para el avance.</p>' +
      '<p><strong>Vac\u00edos.</strong> \u00abVencido sin reporte\u00bb significa que el a\u00f1o de la meta ya pas\u00f3 y no hay dato; ' +
      '\u00abBorrador\u00bb marca indicadores propuestos que la DCC todav\u00eda no valida.</p></div>';
  };

  SinameccSeguimiento.prototype._matches = function (indicator) {
    var f = this._filters;
    if (f.status && indicator.progress.status !== f.status) return false;
    if (f.gender && !indicator.is_gender_indicator && !indicator.has_sex_disaggregation) return false;
    if (f.q) {
      var text = (indicator.code + ' ' + indicator.name + ' ' + indicator.responsible_institution).toLowerCase();
      if (text.indexOf(f.q) === -1) return false;
    }
    return true;
  };

  function fileSize(kb) {
    return kb >= 1024 ? fmt(kb / 1024, 1) + ' MB' : Math.max(1, kb) + ' kB';
  }

  SinameccSeguimiento.prototype._pubList = function (items) {
    var base = this._base();
    if (!items || !items.length) return '';
    return '<ul class="pubs">' + items.map(function (p) {
      var href = (base ? base + '/' : '') + p.path;
      return '<li><span class="pdf" aria-hidden="true">PDF</span><span class="pub-text"><span class="pub-title">' +
        esc(p.title) + '</span><span class="small muted">' + esc(p.description || '') +
        ' \u00b7 ' + fileSize(p.size_kb || 0) + (p.date ? ' \u00b7 ' + dateText(p.date) : '') + '</span></span>' +
        '<a class="btn" href="' + esc(href) + '" data-file="' + esc(p.path) + '" target="_blank" rel="noopener">Descargar</a></li>';
    }).join('') + '</ul>';
  };

  SinameccSeguimiento.prototype._docList = function (instruments) {
    var docs = (instruments || []).filter(function (i) { return i.official_document_url; });
    if (!docs.length) return '';
    return '<ul class="pubs">' + docs.map(function (i) {
      return '<li><span class="pdf doc" aria-hidden="true">DOC</span><span class="pub-text"><span class="pub-title">' +
        esc(i.name) + '</span><span class="small muted">Documento oficial \u00b7 ' + esc(i.lead_institution) + '</span></span>' +
        '<a class="btn ghost" href="' + esc(i.official_document_url) + '" target="_blank" rel="noopener">Abrir</a></li>';
    }).join('') + '</ul>';
  };

  SinameccSeguimiento.prototype._dataList = function () {
    var base = this._base();
    if (!base) return '';
    var files = [
      ['valores.csv', 'Valores aceptados', 'Todos los datos validados por la DCC, por indicador y a\u00f1o.'],
      ['indicadores.csv', 'Fichas de indicadores', 'Definici\u00f3n, unidad, l\u00ednea de base y fuente de cada indicador.'],
      ['metas.csv', 'Metas', 'Valor esperado de cada indicador por a\u00f1o y documento que lo fija.'],
      ['avance.csv', 'Avance y sem\u00e1foro', '\u00daltimo dato, valor esperado y estado de cada indicador.'],
      ['series_referencia.csv', 'Escenarios', 'Trayectorias de referencia de los planes (no cuentan para el avance).'],
      ['diccionario.csv', 'Diccionario de datos', 'Qu\u00e9 significa cada columna de los archivos.'],
      ['catalogo.dcat.jsonld', 'Cat\u00e1logo DCAT', 'Metadatos para portales de datos abiertos.']
    ];
    return '<ul class="pubs">' + files.map(function (f) {
      return '<li><span class="pdf data" aria-hidden="true">' + (f[0].split('.').pop() === 'csv' ? 'CSV' : 'JSON') + '</span>' +
        '<span class="pub-text"><span class="pub-title">' + f[1] + '</span><span class="small muted">' + f[2] + '</span></span>' +
        '<a class="btn ghost" href="' + esc(base + '/' + f[0]) + '" data-file="' + esc(f[0]) + '" target="_blank" rel="noopener">Descargar</a></li>';
    }).join('') + '</ul>';
  };

  function nodeDetails(node) {
    var parts = [];
    if (node.description) parts.push('<p class="desc">' + esc(node.description) + '</p>');
    var facts = [];
    if (node.conditionality) {
      facts.push('<span class="tag" title="' + esc(node.conditionality_text || '') + '">' + esc(node.conditionality) + '</span>');
    }
    var red = node.reduction_kt || {};
    var redYears = Object.keys(red).sort();
    if (redYears.length) {
      facts.push('Reducci\u00f3n estimada: ' + redYears.map(function (y) {
        return fmt(red[y], 0) + ' Gg CO\u2082e (' + esc(y) + ')';
      }).join(' \u00b7 '));
    }
    if (node.cost_musd != null) facts.push('Costo estimado: USD ' + fmt(node.cost_musd) + ' millones');
    if (facts.length) parts.push('<p class="facts small">' + facts.join('<span aria-hidden="true"> \u00b7 </span>') + '</p>');
    if (node.conditionality_text) {
      parts.push('<p class="small muted">' + esc(node.conditionality) + ': ' + esc(node.conditionality_text) + '</p>');
    }
    if (node.implementing_entities) {
      parts.push('<p class="small"><span class="muted">Actores involucrados:</span> ' + esc(node.implementing_entities) + '</p>');
    }
    if ((node.targets_text || []).length) {
      parts.push('<div class="milestones"><span class="kicker">Metas del plan</span><ul class="plain">' +
        node.targets_text.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>');
    }
    if ((node.activities || []).length) {
      parts.push('<details class="acts"><summary>Actividades (' + node.activities.length + ')</summary><ul class="plain">' +
        node.activities.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></details>');
    }
    var years = Object.keys(node.milestones || {}).sort();
    if (years.length) {
      parts.push('<div class="milestones"><span class="kicker">Hitos comprometidos</span>' + years.map(function (y) {
        return '<div class="ms"><span class="ms-year">' + esc(y) + '</span><ul>' + node.milestones[y].map(function (t) {
          return '<li>' + esc(t) + '</li>';
        }).join('') + '</ul></div>';
      }).join('') + '</div>');
    }
    if (node.reference_year || node.tracking_entities || node.status_text) {
      parts.push('<details class="acts"><summary>Seguimiento de la contribuci\u00f3n (ficha t\u00e9cnica)</summary>' +
        (node.reference_year ? '<p class="small"><span class="muted">A\u00f1o de referencia:</span> ' + esc(node.reference_year) + '</p>' : '') +
        (node.tracking_entities ? '<p class="small"><span class="muted">Dan seguimiento:</span> ' + esc(node.tracking_entities) + '</p>' : '') +
        (node.status_text ? '<p class="small"><span class="muted">Estado reportado:</span> ' + esc(node.status_text) + '</p>' : '') +
        (node.technical_sheet ? '<p class="small muted">Fuente: ' + esc(node.technical_sheet) + '</p>' : '') + '</details>');
    }
    if (node.level === 'contribution' && !node.mpg_status && (node.reduction_kt && Object.keys(node.reduction_kt).length)) {
      parts.push('<p class="small"><span class="muted">Estado de implementaci\u00f3n:</span> sin reportar (se toma de la tabla de pol\u00edticas y medidas del BTR).</p>');
    }
    if (node.source) parts.push('<p class="small muted">Fuente: ' + esc(node.source) + '</p>');
    return parts.length ? '<div class="detail">' + parts.join('') + '</div>' : '';
  }

  function countIndicators(progress) {
    var counts = (progress && progress.indicator_counts) || {};
    var total = 0;
    Object.keys(counts).forEach(function (k) { total += counts[k] || 0; });
    return total;
  }

  SinameccSeguimiento.prototype._renderNode = function (node, depth, parentMatched) {
    var self = this;
    var q = this._filters.q;
    var nodeMatches = parentMatched || (q && (node.code + ' ' + node.name + ' ' + (node.description || '')).toLowerCase().indexOf(q) !== -1);
    var indicators = node.indicators.filter(function (i) {
      return self._matches(i) || (nodeMatches && !self._filters.status && !self._filters.gender);
    });
    var children = node.children.map(function (c) { return self._renderNode(c, depth + 1, nodeMatches); }).filter(Boolean);
    var filtering = q || this._filters.status || this._filters.gender;
    var keepForText = nodeMatches && !this._filters.status && !this._filters.gender;
    if (filtering && !indicators.length && !children.length && !keepForText) return '';
    var open = filtering || depth === 0 && node.children.length === 0;
    var p = node.progress;
    var progressText = pct(p.progress_percent);
    var headChip = countIndicators(p) === 0
      ? '<span class="chip no_target">Sin indicadores a\u00fan</span>'
      : chip(p.status, progressText);
    var body = indicators.map(function (i) {
      var ip = i.progress;
      var line = lineFor(i);
      return '<button type="button" class="ind" data-go-indicator="' + esc(i.code) + '">' +
        '<span class="name">' + (i.draft ? '<span class="tag draft">Borrador</span> ' : '') + esc(i.name) + '</span>' +
        chip(ip.status, pct(ip.progress_percent)) +
        meter(ip.progress_percent, ip.status) +
        '<span class="meta">' + line + ' \u00b7 ' + (i.responsible_pending ? 'Responsable por asignar' : esc(i.responsible_institution)) +
        (i.is_gender_indicator ? ' \u00b7 Indicador de g\u00e9nero' : '') + '</span></button>';
    }).join('');
    return '<div class="node depth' + depth + (open ? ' open' : '') + '">' +
      '<button type="button" class="node-head" aria-expanded="' + (open ? 'true' : 'false') + '" data-toggle>' +
      '<span class="name"><span class="caret" aria-hidden="true">\u25b8</span><span class="code">' + esc(node.code) + '</span>' +
      esc(node.name) + ' <span class="muted small">(' + esc(node.level_label) + ')</span></span>' +
      headChip + '</button>' +
      '<div class="node-body">' + nodeDetails(node) + body + children.join('') + '</div></div>';
  };

  SinameccSeguimiento.prototype._renderInstrument = function (d) {
    var counts = d.indicator_status_counts || {};
    var stats = STATUS_ORDER.map(function (k) {
      return '<div class="stat"><b>' + (counts[k] || 0) + '</b><span class="small">' + chip(k) + '</span></div>';
    }).join('');
    var self = this;
    var tree = (d.components || []).map(function (c) { return self._renderNode(c, 0); }).join('');
    var headlines = (d.headline_indicators || []).map(function (i) { return self._renderHeadline(i); }).join('');
    var cov = d.coverage;
    var coverage = cov && d.indicator_count ? '<p class="coverage muted">De ' + d.indicator_count + ' indicadores: ' +
      cov.with_target + ' con meta, ' + cov.with_baseline + ' con l\u00ednea de base y ' + cov.with_values +
      ' con datos aceptados.' + (cov.with_values < d.indicator_count ? ' Los dem\u00e1s esperan el reporte de la instituci\u00f3n responsable.' : '') + '</p>' : '';
    var f = this._filters;
    var options = '<option value="">Todos los estados</option>' + STATUS_ORDER.map(function (k) {
      return '<option value="' + k + '"' + (f.status === k ? ' selected' : '') + '>' + STATUS[k].label + '</option>';
    }).join('');
    var back = this.getAttribute('instrument') && !this.hasAttribute('hash-routing') ? ''
      : '<button type="button" class="back" data-go-home>\u2190 Todos los instrumentos</button>';
    return back + '<span class="kicker">' + esc(d.instrument_type_label) + '</span>' +
      '<h2>' + esc(d.name) + '</h2>' + (termBadge(d) ? '<p>' + termBadge(d) + (d.term_status === 'ended'
        ? ' <span class="small muted">Sus metas se muestran para rendir cuentas sobre lo comprometido; corresponde actualizar el instrumento.</span>' : '') + '</p>' : '') +
      (d.description ? '<p>' + esc(d.description) + '</p>' : '') +
      '<p class="muted small">Rector\u00eda: ' + esc(d.lead_institution) +
      (d.reporting_cycle_description ? ' \u00b7 Reporte: ' + esc(d.reporting_cycle_description) : '') +
      (d.official_document_url ? ' \u00b7 <a href="' + esc(d.official_document_url) + '" target="_blank" rel="noopener">Documento oficial</a>' : '') +
      '</p>' + (this.getAttribute('downloads') !== 'false' ? this._pubList((d.publicaciones || []).filter(function (p) { return p.kind === 'report' || p.kind === 'dossier'; })) : '') +
      headlines +
      '<div class="summary" aria-label="Indicadores por estado">' + stats + '</div>' +
      stackedBar(counts, 'Indicadores de ' + d.short_name) + coverage +
      '<p class="muted small" style="margin-top:8px">\u00abEn tiempo\u00bb = avance de al menos ' + fmt(d.thresholds.on_track, 0) +
      ' % de lo esperado para el a\u00f1o; \u00aben riesgo\u00bb = desde ' + fmt(d.thresholds.at_risk, 0) + ' %; por debajo, \u00abatrasado\u00bb. ' +
      '\u00abVencido sin reporte\u00bb = el a\u00f1o de la meta ya pas\u00f3 sin dato.</p>' +
      '<div class="toolbar" role="search"><label class="sr" for="q">Buscar indicador</label>' +
      '<input id="q" type="search" placeholder="Buscar por nombre, c\u00f3digo o instituci\u00f3n" value="' + esc(f.q) + '" data-filter="q">' +
      '<label class="sr" for="st">Estado</label><select id="st" data-filter="status">' + options + '</select>' +
      '<label><input type="checkbox" data-filter="gender"' + (f.gender ? ' checked' : '') + '> Solo con enfoque de g\u00e9nero</label></div>' +
      '<div class="tree">' + (tree || '<p class="muted">Este instrumento a\u00fan no tiene componentes publicados.</p>') + '</div>';
  };

  var SOURCE_STATUS = {
    cargado: ['Cargado', 'on_track'], parcial: ['Cargado en parte', 'at_risk'],
    consultado: ['Consultado, no cargado', 'no_target'], pendiente: ['Pendiente', 'delayed']
  };

  SinameccSeguimiento.prototype._renderSources = function (data, index) {
    var names = {};
    ((index && index.instrumentos) || []).forEach(function (i) { names[i.code] = i.short_name; });
    var label = function (codes) {
      return (codes || []).map(function (c) { return esc(names[c] || c); }).join(', ');
    };
    var sources = data.sources || [], pending = (data.pending || []).slice().sort(function (a, b) { return a.priority - b.priority; });
    var counts = {};
    sources.forEach(function (s) { counts[s.status] = (counts[s.status] || 0) + 1; });
    var stats = ['cargado', 'parcial', 'consultado'].map(function (k) {
      return '<div class="stat"><b>' + (counts[k] || 0) + '</b><span class="small">' + srcChip(k) + '</span></div>';
    }).join('') + '<div class="stat"><b>' + pending.length + '</b><span class="small">' + srcChip('pendiente') + '</span></div>';
    function srcChip(k) {
      var st = SOURCE_STATUS[k] || [k, 'no_data'];
      return '<span class="chip ' + st[1] + '"><span class="dot s-' + st[1] + '" aria-hidden="true"></span>' + esc(st[0]) + '</span>';
    }
    var list = sources.map(function (s) {
      return '<li class="src"><div class="src-head"><span class="pub-title">' + esc(s.title) + '</span>' + srcChip(s.status) + '</div>' +
        '<span class="small muted">' + esc(s.institution) + (s.date ? ' \u00b7 ' + esc(s.date) : '') + ' \u00b7 ' + esc(s.kind) +
        (s.instruments && s.instruments.length ? ' \u00b7 Alimenta: ' + label(s.instruments) : '') + '</span>' +
        '<p class="small">' + esc(s.what) + '</p>' +
        '<span class="small muted">Archivo: ' + esc(s.file) + '</span>' +
        (s.url ? ' <a class="small" href="' + esc(s.url) + '" target="_blank" rel="noopener">Abrir documento oficial</a>' : '') + '</li>';
    }).join('');
    var todo = pending.map(function (p) {
      return '<tr><td class="num">' + esc(p.priority) + '</td><td><strong>' + esc(p.title) + '</strong><br><span class="small muted">' +
        esc(p.why) + '</span></td><td class="small">' + esc(p.holder) + '</td><td class="small">' + (label(p.instruments) || 'General') + '</td></tr>';
    }).join('');
    var back = '<button type="button" class="back" data-go-home>\u2190 Todos los instrumentos</button>';
    return back + '<span class="kicker">Transparencia</span><h2>Fuentes de informaci\u00f3n</h2>' +
      '<p class="muted">Cada cifra del tablero indica de qu\u00e9 documento sale. Esta p\u00e1gina re\u00fane esos documentos, lo que se tom\u00f3 de cada uno ' +
      'y los que faltan para completar el seguimiento.' + (data.generado ? ' Actualizado el ' + dateText(data.generado) + '.' : '') + '</p>' +
      '<div class="summary">' + stats + '</div>' +
      '<h3>Documentos que faltan</h3><p class="small muted">Prioridad 1: necesarios para mostrar avance real. Si usted tiene alguno, env\u00edelo a la Direcci\u00f3n de Cambio Clim\u00e1tico.</p>' +
      '<div class="table-scroll"><table><thead><tr><th scope="col" class="num">Prioridad</th><th scope="col">Documento</th><th scope="col">Qui\u00e9n lo tiene</th>' +
      '<th scope="col">Instrumento</th></tr></thead><tbody>' + todo + '</tbody></table></div>' +
      '<h3>Documentos consultados (' + sources.length + ')</h3><ul class="srcs">' + list + '</ul>';
  };

  SinameccSeguimiento.prototype._renderGlossary = function () {
    return '<button type="button" class="back" data-go-home>\u2190 Todos los instrumentos</button><span class="kicker">Ayuda</span><h2>Glosario</h2>' +
      '<p class="muted">Palabras y siglas que aparecen en el tablero, en lenguaje sencillo.</p><dl class="gloss">' +
      GLOSSARY.map(function (g) { return '<dt>' + g[0] + '</dt><dd>' + g[1] + '</dd>'; }).join('') + '</dl>';
  };

  var REC_STATUS = { abierta: ['Abierta', 'delayed'], 'en curso': ['En curso', 'at_risk'], atendida: ['Atendida', 'on_track'] };

  SinameccSeguimiento.prototype._renderRecommendations = function (data, index) {
    var names = {};
    ((index && index.instrumentos) || []).forEach(function (i) { names[i.code] = i.short_name; });
    var items = data.items || [], counts = {};
    items.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; });
    var recChip = function (k) {
      var st = REC_STATUS[k] || [k, 'no_data'];
      return '<span class="chip ' + st[1] + '"><span class="dot s-' + st[1] + '" aria-hidden="true"></span>' + esc(st[0]) + '</span>';
    };
    var rows = items.map(function (r) {
      return '<tr><td class="small rec-code"><code>' + esc(r.id).replace(/, /g, ',\u200b ') + '</code></td><td><strong>' + esc(r.topic) + '</strong><br><span class="small">' + esc(r.text) +
        (r.detail_pending ? ' <span class="muted">El texto completo est\u00e1 en el anexo de la revisi\u00f3n.</span>' : '') +
        (r.progress_note ? '<br><span class="small muted">' + esc(r.progress_note) + '</span>' : '') + '</span></td>' +
        '<td class="small">' + esc(r.owner) + '</td><td class="small">' + esc(r.deadline) + '</td><td>' + recChip(r.status) + '</td>' +
        '<td class="small">' + (r.instruments || []).map(function (c) { return esc(names[c] || c); }).join(', ') + '</td></tr>';
    }).join('');
    return '<button type="button" class="back" data-go-home>\u2190 Todos los instrumentos</button><span class="kicker">Rendici\u00f3n de cuentas</span>' +
      '<h2>Recomendaciones y acciones de mejora</h2>' +
      '<p class="muted">Lo que la revisi\u00f3n t\u00e9cnica internacional del primer BTR recomend\u00f3 a Costa Rica y en qu\u00e9 estado est\u00e1 cada punto. ' +
      'Responsables y estados son una propuesta inicial que la Direcci\u00f3n de Cambio Clim\u00e1tico debe validar.</p>' +
      (data.verdict ? '<blockquote class="quote">' + esc(data.verdict.text) + '<footer class="small muted">' + esc(data.source) + ', ' + esc(data.verdict.ref) + '</footer></blockquote>' : '') +
      '<div class="summary">' + ['abierta', 'en curso', 'atendida'].map(function (k) {
        return '<div class="stat"><b>' + (counts[k] || 0) + '</b><span class="small">' + recChip(k) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="table-scroll"><table><thead><tr><th scope="col">C\u00f3digo</th><th scope="col">Recomendaci\u00f3n</th><th scope="col">Responsable propuesto</th>' +
      '<th scope="col">Plazo</th><th scope="col">Estado</th><th scope="col">Instrumento</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="small muted">Fuente: ' + esc(data.source) + '.</p>';
  };

  SinameccSeguimiento.prototype._renderCanton = function (atlas, wanted) {
    var cantons = atlas.cantons || [];
    var pick = cantons.filter(function (c) { return slug(c.canton) === wanted; })[0] || cantons[0];
    if (!pick) return '<p class="muted">No hay datos cantonales.</p>';
    var rank = function (key, higherIsBetter) {
      var list = cantons.filter(function (c) { return c[key] && c[key]['2024'] != null; })
        .sort(function (a, b) { return higherIsBetter ? b[key]['2024'] - a[key]['2024'] : a[key]['2024'] - b[key]['2024']; });
      for (var i = 0; i < list.length; i++) if (list[i] === pick) return (i + 1) + ' de ' + list.length;
      return '';
    };
    var options = cantons.map(function (c) {
      return '<option value="' + slug(c.canton) + '"' + (c === pick ? ' selected' : '') + '>' + esc(c.canton) + ' (' + esc(c.province) + ')</option>';
    }).join('');
    var card = function (key, label, better) {
      var series = pick[key] || {};
      var v = series['2024'], first = series[Object.keys(series)[0]];
      return '<div><span class="small muted">' + label + ' 2024</span><b>' + fmt(v, 3) + '</b><span class="small muted">Puesto ' + rank(key, better) +
        (first != null ? ' \u00b7 ' + Object.keys(series)[0] + ': ' + fmt(first, 3) : '') + '</span></div>';
    };
    var idh = pick.IDH || {};
    var detail = { name: 'IDH de ' + pick.canton, unit: '\u00edndice', values: Object.keys(idh).map(function (y) { return { year: Number(y), value: idh[y] }; }) };
    var pndip = (this._index && (this._index.instrumentos || []).filter(function (i) { return i.code === 'pndip-2027-2030'; })[0]);
    return '<button type="button" class="back" data-go-home>\u2190 Todos los instrumentos</button><span class="kicker">Pertinencia local</span>' +
      '<h2>Mi cant\u00f3n: ' + esc(pick.canton) + '</h2>' +
      '<div class="toolbar"><label for="canton">Cant\u00f3n</label><select id="canton" data-canton>' + options + '</select></div>' +
      '<p class="muted">Contexto de desarrollo humano y de g\u00e9nero del cant\u00f3n, para leer la acci\u00f3n clim\u00e1tica desde el territorio. Provincia de ' + esc(pick.province) + '.</p>' +
      '<div class="figures">' + card('IDH', 'Desarrollo humano (IDH)', true) + card('IDH-D', 'IDH ajustado por desigualdad', true) +
      card('IDG', 'Desarrollo de g\u00e9nero (IDG)', true) + card('IDG-D', 'Desigualdad de g\u00e9nero (IDG-D)', false) + '</div>' +
      '<p class="small muted">IDH, IDH-D e IDG: m\u00e1s alto es mejor. IDG-D: m\u00e1s bajo es mejor (menos desigualdad). El puesto compara los ' + cantons.length + ' cantones.</p>' +
      chart(detail, this._charts) +
      '<h3>Acci\u00f3n clim\u00e1tica en el territorio</h3>' +
      '<div class="notice small">Los planes cargados todav\u00eda no ubican sus acciones por cant\u00f3n. ' +
      (pndip ? 'El PNDIP 2027\u20132030 indica la regi\u00f3n de algunas intervenciones (carbono azul en Chorotega, Brunca y Pac\u00edfico Central; medidores inteligentes en la Regi\u00f3n Central y Huetar Norte; ecosistemas marino-costeros del Pac\u00edfico y el Caribe). ' : '') +
      'La ubicaci\u00f3n de las acciones por cant\u00f3n est\u00e1 registrada como documento pendiente en <button type="button" class="link" data-go-instrument="fuentes">Fuentes de informaci\u00f3n</button>.</div>' +
      '<p class="small">El \u00cdndice de Desigualdad de G\u00e9nero ayuda a priorizar las acciones del <button type="button" class="link" data-go-instrument="pgcc">Plan de G\u00e9nero y Cambio Clim\u00e1tico</button> en el territorio.</p>' +
      '<p class="small muted">Fuente: ' + esc(atlas.source) + '.</p>';
  };

  SinameccSeguimiento.prototype._renderHeadline = function (i) {
    var ip = i.progress || {}, b = i.baseline || {}, targets = i.targets || [];
    var t = targets.length ? targets[targets.length - 1] : null;
    var figures = [];
    if (b.value != null) figures.push('<div><span class="small muted">L\u00ednea base ' + esc(b.year) + '</span><b>' + fmt(b.value) + '</b></div>');
    if (ip.year && !(b.year != null && ip.year <= b.year)) {
      figures.push('<div><span class="small muted">\u00daltimo dato ' + ip.year + '</span><b>' + fmt(ip.actual) + '</b></div>');
      if (ip.target != null) figures.push('<div><span class="small muted">Esperado para ' + ip.year + '</span><b>' + fmt(ip.target) + '</b></div>');
    }
    if (t) figures.push('<div><span class="small muted">Meta ' + esc(t.year) + '</span><b>' + fmt(t.value) + '</b></div>');
    return '<section class="headline" aria-label="' + esc(i.name) + '"><div class="top"><span><span class="kicker">Meta principal</span>' +
      '<span class="title" style="display:block">' + esc(i.name) + '</span></span>' + chip(ip.status, pct(ip.progress_percent)) + '</div>' +
      '<p class="why">' + explain(i) + '</p>' +
      '<div class="figures">' + figures.join('') + '</div>' +
      '<p class="small muted" style="margin:0">Valores en ' + esc(i.unit) + '.' + (i.notes ? ' ' + esc(i.notes) : '') + '</p>' +
      chart(i, this._charts) +
      '<button type="button" class="link" data-go-indicator="' + esc(i.code) + '">Ver ficha, fuentes y datos</button></section>';
  };

  SinameccSeguimiento.prototype._renderIndicator = function (d, state) {
    var p = d.progress || {};
    var anyDis = (d.values || []).some(function (v) { return v.disaggregation && Object.keys(v.disaggregation).length; });
    var rows = (d.values || []).map(function (v) {
      var dis = v.disaggregation && Object.keys(v.disaggregation).length
        ? Object.keys(v.disaggregation).map(function (k) { return esc(k) + ': ' + esc(v.disaggregation[k]); }).join(', ')
        : 'Total';
      return '<tr><td>' + esc(v.year) + (v.period_label ? ' (' + esc(v.period_label) + ')' : '') + '</td>' + (anyDis ? '<td>' + dis + '</td>' : '') +
        '<td class="num">' + (v.value != null ? fmt(v.value) : '<span class="muted">' + esc(v.no_data_reason || 'Sin dato') + '</span>') +
        '</td><td class="small nowrap">' + (v.accepted_at ? dateText(v.accepted_at) : '') +
        (v.version > 1 ? ' \u00b7 versi\u00f3n ' + v.version : '') +
        (v.evidence_url ? ' \u00b7 <a href="' + esc(v.evidence_url) + '" target="_blank" rel="noopener">fuente</a>' : '') + '</td>' +
        '<td class="small">' + esc(v.note || '') + '</td></tr>';
    }).join('');
    var targets = (d.targets || []).map(function (t) {
      return '<tr><td>' + esc(t.year) + '</td><td class="num">' + fmt(t.value) + '</td><td class="small">' + esc(t.source || '') + '</td></tr>';
    }).join('');
    var usedIn = (d.instruments || []).map(function (i) {
      return esc(i.short_name) + (i.components.length ? ' (' + i.components.map(esc).join(', ') + ')' : '');
    }).join('; ');
    var back = '<button type="button" class="back" data-go-back="' + esc(state.instrument || '') + '">\u2190 Volver</button>';
    var disNote = (d.disaggregations || []).length && !(d.disaggregations_available || []).length
      ? '<div class="notice small">Este indicador prev\u00e9 desagregaci\u00f3n por ' + d.disaggregations.map(esc).join(', ') +
        ', pero todav\u00eda no hay datos desagregados.</div>' : '';
    var families = {};
    (d.values || []).forEach(function (v) {
      var n = v.note || '';
      var fam = /CRT/.test(n) ? 'tablas CRT del BTR1' : /Documento del Inventario/.test(n) ? 'Documento del Inventario Nacional'
        : /estimaci/i.test(n) ? 'estimaciones de la CND' : /INGEI/.test(n) ? 'INGEI 1990\u20132021' : n ? 'otra' : '';
      if (fam) families[fam] = true;
    });
    var famList = Object.keys(families);
    var mixed = famList.length > 1 ? '<div class="notice small">La serie combina fuentes: ' + famList.map(esc).join(', ') +
      '. Las versiones del inventario pueden diferir entre s\u00ed; el origen de cada valor est\u00e1 en la tabla.</div>' : '';
    return back + '<span class="kicker">Indicador' + (d.draft ? ' \u00b7 <span class="tag draft">Borrador</span>' : '') + '</span><h2>' + esc(d.name) + '</h2>' +
      '<p>' + chip(p.status || 'no_data', p.progress_percent == null ? '' : (p.progress_percent < 0 ? 'se aleja de la meta' : fmt(p.progress_percent, 0) + ' % de lo esperado')) +
      (p.year ? ' <span class="muted small">\u00daltimo a\u00f1o con dato: ' + p.year + '</span>' : '') + '</p>' +
      '<p class="why">' + explain(d) + '</p>' +
      (d.draft ? '<div class="notice small">Indicador propuesto en un documento borrador; la Direcci\u00f3n de Cambio Clim\u00e1tico todav\u00eda no lo valida.</div>' : '') +
      (d.definition ? '<p>' + esc(d.definition) + '</p>' : '') + disNote +
      (this.getAttribute('downloads') !== 'false' ? this._pubList(d.publicaciones || []) : '') +
      (d.notes ? '<p class="small">' + esc(d.notes) + '</p>' : '') +
      chart(d, this._charts) + mixed +
      '<h3>Ficha</h3><dl>' +
      '<dt>C\u00f3digo</dt><dd><code>' + esc(d.code) + '</code></dd>' +
      '<dt>Unidad</dt><dd>' + esc(d.unit) + '</dd>' +
      '<dt>Sentido deseado</dt><dd>' + esc(DIRECTION[d.direction] || d.direction) + '</dd>' +
      '<dt>L\u00ednea base</dt><dd>' + baselineText(d.baseline) + '</dd>' +
      '<dt>Frecuencia</dt><dd>' + esc(d.periodicity_label || d.periodicity) + '</dd>' +
      '<dt>F\u00f3rmula</dt><dd>' + (d.formula ? esc(d.formula) : '<span class="muted">Por definir en la ficha metodol\u00f3gica</span>') + '</dd>' +
      '<dt>Responsable</dt><dd>' + (d.responsible_pending ? 'Por asignar <span class="small muted">(provisional: ' + esc(d.responsible_institution) + ')</span>' : esc(d.responsible_institution)) + '</dd>' +
      (d.primary_source ? '<dt>Fuente</dt><dd>' + esc(d.primary_source) + '</dd>' : '') +
      (d.methodology_url ? '<dt>Metodolog\u00eda</dt><dd><a href="' + esc(d.methodology_url) + '" target="_blank" rel="noopener">Ver documento</a></dd>' : '') +
      (d.gwp_set ? '<dt>Potenciales de calentamiento</dt><dd>' + esc(d.gwp_set) + '</dd>' : '') +
      (usedIn ? '<dt>Se usa en</dt><dd>' + usedIn + '</dd>' : '') +
      (d.reports_to_btr ? '<dt>Informe a la ONU</dt><dd>Se reporta en el Informe Bienal de Transparencia</dd>' : '') +
      '</dl>' +
      '<h3>Valores aceptados</h3>' + (rows
        ? '<div class="table-scroll"><table><thead><tr><th scope="col">A\u00f1o</th>' + (anyDis ? '<th scope="col">Desagregaci\u00f3n</th>' : '') +
          '<th scope="col" class="num">Valor (' + esc(d.unit) + ')</th>' +
          '<th scope="col">Aceptado</th><th scope="col">Origen del dato</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<p class="muted">Todav\u00eda no hay valores aceptados.</p>') +
      (targets ? '<h3>Metas</h3><table><thead><tr><th scope="col">A\u00f1o</th><th scope="col" class="num">Meta</th>' +
        '<th scope="col">Fuente</th></tr></thead><tbody>' + targets + '</tbody></table>' : '') +
      seriesTable(d.reference_series || []);
  };

  SinameccSeguimiento.prototype._footer = function () {
    var base = this._base();
    var links = base && this.getAttribute('downloads') !== 'false' && this._state().instrument ? '<div class="downloads">Descargar datos abiertos: ' +
      '<a href="' + esc(base) + '/valores.csv">valores (CSV)</a>' +
      '<a href="' + esc(base) + '/indicadores.csv">indicadores (CSV)</a>' +
      '<a href="' + esc(base) + '/avance.csv">avance (CSV)</a>' +
      '<a href="' + esc(base) + '/diccionario.csv">diccionario de datos</a>' +
      '<a href="' + esc(base) + '/catalogo.dcat.jsonld">cat\u00e1logo DCAT</a></div>' : '';
    var meta = this._index || this._tree || {};
    var lic = meta.licencia;
    return '<footer>Fuente: Sistema Nacional de M\u00e9trica de Cambio Clim\u00e1tico (SINAMECC), MINAE.' +
      (meta.generado ? ' Datos publicados el ' + dateText(meta.generado) + '.' : '') +
      (lic ? ' ' + (lic.url ? '<a href="' + esc(lic.url) + '" target="_blank" rel="noopener">' + esc(lic.name) + '</a>' : esc(lic.name)) + '.' : '') +
      links + '</footer>';
  };

  // ------------------------------------------------------------------------- events
  SinameccSeguimiento.prototype._onClick = function (e) {
    var link = e.target.closest('a[data-file]');
    // Offline copy: files embedded in the page open from memory instead of the network.
    var files = window.SINAMECC_SEGUIMIENTO_FILES;
    if (link && files && files[link.getAttribute('data-file')]) {
      e.preventDefault();
      var f = files[link.getAttribute('data-file')];
      var bytes = atob(f.data), buf = new Uint8Array(bytes.length);
      for (var i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([buf], { type: f.type }));
      var a = document.createElement('a');
      a.href = url; a.download = link.getAttribute('data-file').split('/').pop();
      if (f.type === 'application/pdf') { a.target = '_blank'; a.removeAttribute('download'); }
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      return;
    }
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-toggle')) {
      var node = t.parentNode;
      var open = node.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    this._focusNext = true;
    if (t.hasAttribute('data-go-instrument')) {
      this._filters = { q: '', status: '', gender: false };
      this._go(t.getAttribute('data-go-instrument'), null);
    } else if (t.hasAttribute('data-go-indicator')) {
      this._go(this._state().instrument || (this._tree && this._tree.code), t.getAttribute('data-go-indicator'));
    } else if (t.hasAttribute('data-go-back')) {
      this._go(t.getAttribute('data-go-back') || null, null);
    } else if (t.hasAttribute('data-go-home')) {
      this._go(null, null);
    }
  };

  SinameccSeguimiento.prototype._hideTips = function () {
    var tips = this._root.querySelectorAll('.tip');
    for (var i = 0; i < tips.length; i++) tips[i].hidden = true;
    var lines = this._root.querySelectorAll('.cross');
    for (var j = 0; j < lines.length; j++) lines[j].setAttribute('visibility', 'hidden');
  };

  SinameccSeguimiento.prototype._onHover = function (e) {
    var svg = e.target.closest && e.target.closest('svg[data-chart]');
    if (!svg) { this._hideTips(); return; }
    var c = (this._chartsShown || [])[Number(svg.getAttribute('data-chart'))];
    if (!c) return;
    var rect = svg.getBoundingClientRect();
    var sx = (e.clientX - rect.left) / rect.width * c.W;
    var year = Math.round(c.x0 + (sx - c.L) / (c.W - c.L - c.R) * (c.x1 - c.x0));
    year = Math.max(Math.ceil(c.x0), Math.min(Math.floor(c.x1), year));
    var rows = c.series.map(function (s) {
      var v = valueAt(s, year);
      return v == null ? '' : '<div><i style="background:' + s.color + '"></i><span>' + esc(s.name) + '</span><strong>' + fmt(v) + '</strong></div>';
    }).join('');
    var tip = svg.parentNode.querySelector('.tip');
    var cross = svg.querySelector('.cross');
    var x = c.L + (year - c.x0) / (c.x1 - c.x0) * (c.W - c.L - c.R);
    cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', rows ? 'visible' : 'hidden');
    if (!rows) { tip.hidden = true; return; }
    tip.innerHTML = '<b>' + year + (c.unit ? ' \u00b7 ' + esc(c.unit) : '') + '</b>' + rows;
    tip.hidden = false;
    var px = x / c.W * rect.width;
    var left = px + 14;
    if (left + tip.offsetWidth > rect.width) left = Math.max(0, px - 14 - tip.offsetWidth);
    tip.style.left = left + 'px';
  };

  SinameccSeguimiento.prototype._onInput = function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-canton') && e.type === 'change') {
      this._cantonSlug = e.target.value;
      if (this.hasAttribute('hash-routing')) { window.location.hash = '#seguimiento/canton/' + e.target.value; return; }
      this._go('canton', null);
      return;
    }
    var key = e.target.getAttribute && e.target.getAttribute('data-filter');
    if (!key || !this._tree) return;
    this._filters[key] = key === 'gender' ? e.target.checked : (key === 'q' ? e.target.value.trim().toLowerCase() : e.target.value);
    var self = this;
    var tree = (this._tree.components || []).map(function (c) { return self._renderNode(c, 0); }).join('');
    this._root.querySelector('.tree').innerHTML = tree ||
      '<p class="muted">Ning\u00fan indicador coincide con el filtro.</p>';
  };

  window.customElements.define('sinamecc-seguimiento', SinameccSeguimiento);
})();
