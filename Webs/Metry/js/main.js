// Variables and constants
let chart;
const colors = ['#4a90e2', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
let currentInput = null;
let compareVisibility = [];
let stepMode = false;
let stepX = 0;
let annotationAddMode = false;
let annotations = [];
let degreesMode = false;

const trigFunctions = {
    sin: x => degreesMode ? Math.sin(x * Math.PI / 180) : Math.sin(x),
    cos: x => degreesMode ? Math.cos(x * Math.PI / 180) : Math.cos(x),
    tan: x => degreesMode ? Math.tan(x * Math.PI / 180) : Math.tan(x),
    asin: x => degreesMode ? Math.asin(x) * 180 / Math.PI : Math.asin(x),
    acos: x => degreesMode ? Math.acos(x) * 180 / Math.PI : Math.acos(x),
    atan: x => degreesMode ? Math.atan(x) * 180 / Math.PI : Math.atan(x)
};

if (typeof ChartZoom !== 'undefined') {
    Chart.register(ChartZoom);
}

function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: { datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            elements: { point: { radius: 0 } },
            scales: {
                x: { type: 'linear', position: 'center', grid: { color: '#f1f5f9' }, min: -10, max: 10 },
                y: { type: 'linear', position: 'center', grid: { color: '#f1f5f9' }, min: -5, max: 5 }
            },
            plugins: {
                zoom: {
                    pan: { enabled: true, mode: 'xy' },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
                },
                legend: { display: false }
            }
        }
    });
}

function addInput(val = '') {
    const list = document.getElementById('functions-list');
    const index = list.children.length;
    const color = colors[index % colors.length];
    const div = document.createElement('div');
    div.className = 'input-group';
    div.innerHTML = `
        <div class="color-dot" style="background: ${color}"></div>
        <input type="text" class="func-input" value="${val}" placeholder="Digite f(x)..." oninput="renderAll()" onfocus="currentInput=this">
        <button onclick="this.parentElement.remove(); renderAll()" style="border:none; background:none; cursor:pointer; color:#cbd5e1; font-size: 16px;">✕</button>
    `;
    list.appendChild(div);
    const input = div.querySelector('input');
    currentInput = input;
    if (compareVisibility[index] === undefined) compareVisibility[index] = true;
    if (!val) input.focus();
    updateCompareList();
    return input;
}

function evaluateExpression(expr, x) {
    // Replace math functions with their equivalents
    let safe_expr = expr
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/asin\(/g, 'Math.asin(')
        .replace(/acos\(/g, 'Math.acos(')
        .replace(/atan\(/g, 'Math.atan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/exp\(/g, 'Math.exp(')
        .replace(/log\(/g, 'Math.log(')
        .replace(/log10\(/g, 'Math.log10(')
        .replace(/log2\(/g, 'Math.log2(')
        .replace(/pow\(/g, 'Math.pow(')
        .replace(/floor\(/g, 'Math.floor(')
        .replace(/ceil\(/g, 'Math.ceil(')
        .replace(/round\(/g, 'Math.round(')
        .replace(/pi/g, '(' + Math.PI + ')')
        .replace(/e(?![a-zA-Z])/g, '(' + Math.E + ')')
        .replace(/\^/g, '**');
    
    try {
        // Apply degree conversion for trig functions if needed
        if (degreesMode) {
            safe_expr = safe_expr.replace(/Math\.sin\(/g, 'sin_deg(')
                .replace(/Math\.cos\(/g, 'cos_deg(')
                .replace(/Math\.tan\(/g, 'tan_deg(');
        }
        
        const func = new Function('x', 'sin_deg', 'cos_deg', 'tan_deg', 'return ' + safe_expr);
        return Number(func(x, trigFunctions.sin, trigFunctions.cos, trigFunctions.tan));
    } catch (e) {
        return NaN;
    }
}

function renderAll() {
    const inputs = document.querySelectorAll('.func-input');
    const minX = chart.scales.x.min;
    const maxX = chart.scales.x.max;
    const step = (maxX - minX) / 800;

    chart.data.datasets = Array.from(inputs).map((input, i) => {
        const expr = input.value.trim();
        if (!expr) return null;
        const data = [];
        try {
            const safe_expr_base = expr
                .replace(/sin\(/g, 'Math.sin(')
                .replace(/cos\(/g, 'Math.cos(')
                .replace(/tan\(/g, 'Math.tan(')
                .replace(/asin\(/g, 'Math.asin(')
                .replace(/acos\(/g, 'Math.acos(')
                .replace(/atan\(/g, 'Math.atan(')
                .replace(/sqrt\(/g, 'Math.sqrt(')
                .replace(/abs\(/g, 'Math.abs(')
                .replace(/exp\(/g, 'Math.exp(')
                .replace(/log\(/g, 'Math.log(')
                .replace(/log10\(/g, 'Math.log10(')
                .replace(/log2\(/g, 'Math.log2(')
                .replace(/pow\(/g, 'Math.pow(')
                .replace(/floor\(/g, 'Math.floor(')
                .replace(/ceil\(/g, 'Math.ceil(')
                .replace(/round\(/g, 'Math.round(')
                .replace(/pi/g, '(' + Math.PI + ')')
                .replace(/e(?![a-zA-Z])/g, '(' + Math.E + ')')
                .replace(/\^/g, '**');
            
            for (let x = minX; x <= maxX; x += step) {
                let safe_expr = safe_expr_base;
                if (degreesMode) {
                    safe_expr = safe_expr.replace(/Math\.sin\(/g, 'sin_deg(')
                        .replace(/Math\.cos\(/g, 'cos_deg(')
                        .replace(/Math\.tan\(/g, 'tan_deg(');
                }
                const func = new Function('x', 'sin_deg', 'cos_deg', 'tan_deg', 'return ' + safe_expr);
                const y = func(x, trigFunctions.sin, trigFunctions.cos, trigFunctions.tan);
                data.push({x: x, y: Math.abs(y) > 1000 ? NaN : y});
            }
        } catch (e) {}
        return {
            data: data,
            borderColor: colors[i % colors.length],
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            hidden: compareVisibility[i] === false
        };
    }).filter(d => d !== null);

    renderAnnotations();
    updateCompareList();
    chart.update('none');
}

function clearAll() {
    document.getElementById('functions-list').innerHTML = '';
    chart.data.datasets = [];
    compareVisibility = [];
    chart.resetZoom();
    chart.update();
    updateCompareList();
}

function addModel(f) {
    addInput(f);
    renderAll();
}

function insertMath(s) {
    const input = currentInput || addInput();
    const start = input.selectionStart;
    input.value = input.value.slice(0, start) + s + input.value.slice(input.selectionEnd);
    input.focus();
    const pos = start + s.length;
    input.setSelectionRange(pos, pos);
    renderAll();
}

function updateCompareList() {
    const container = document.getElementById('compare-list');
    container.innerHTML = '';
    const inputs = document.querySelectorAll('.func-input');
    inputs.forEach((input, i) => {
        const item = document.createElement('div');
        item.className = 'compare-item';
        item.innerHTML = `
            <label><input type="checkbox" ${compareVisibility[i] !== false ? 'checked' : ''} onchange="toggleDataset(${i}, this.checked)"> f${i+1}(x) = ${input.value || '...'}</label>
        `;
        container.appendChild(item);
    });
}

function toggleDataset(index, checked) {
    compareVisibility[index] = checked;
    renderAll();
}

function updateStepX(value) {
    stepX = Number(value);
    document.getElementById('step-value').textContent = stepX.toFixed(1);
    const inputs = document.querySelectorAll('.func-input');
    const info = document.getElementById('step-info');
    info.innerHTML = '';
    inputs.forEach((input, i) => {
        const expr = input.value.trim();
        if (!expr) return;
        let y = NaN;
        try { y = evaluateExpression(expr, stepX); } catch (e) {}
        const row = document.createElement('div');
        row.style.color = colors[i % colors.length];
        row.textContent = `f${i+1}(${stepX.toFixed(1)}) = ${Number.isFinite(y) ? y.toFixed(4) : 'indefinido'}`;
        info.appendChild(row);
    });
    renderAll();
}

function addAnnotation(x, y, label) {
    annotations.push({ x, y, label });
    renderAnnotations();
    updateAnnotationList();
}

function updateAnnotationList() {
    const list = document.getElementById('annotation-list');
    list.innerHTML = '';
    annotations.forEach((note, index) => {
        const item = document.createElement('div');
        item.className = 'compare-item';
        item.innerHTML = `<label title="${note.label}">(${note.x.toFixed(2)}, ${note.y.toFixed(2)}) - ${note.label}</label><button class="btn-nav" style="padding:6px 10px;font-size:12px;" onclick="removeAnnotation(${index})">Remover</button>`;
        list.appendChild(item);
    });
}

function removeAnnotation(index) {
    annotations.splice(index, 1);
    renderAnnotations();
    updateAnnotationList();
}

function renderAnnotations() {
    const layer = document.getElementById('annotation-layer');
    layer.innerHTML = '';
    if (!chart) return;
    annotations.forEach(note => {
        const xPixel = chart.scales.x.getPixelForValue(note.x);
        const yPixel = chart.scales.y.getPixelForValue(note.y);
        const dot = document.createElement('div');
        dot.className = 'annotation-point';
        dot.style.left = `${xPixel}px`;
        dot.style.top = `${yPixel}px`;
        layer.appendChild(dot);

        const label = document.createElement('div');
        label.className = 'annotation-label';
        label.textContent = note.label;
        label.style.left = `${xPixel}px`;
        label.style.top = `${yPixel}px`;
        layer.appendChild(label);
    });
}

function exportPNG() {
    const link = document.createElement('a');
    link.href = chart.toBase64Image('image/png', 1);
    link.download = 'metry-grafico.png';
    link.click();
}
