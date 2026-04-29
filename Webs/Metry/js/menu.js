// Models and Menu
const models = [
    { n: 'Seno', f: 'sin(x)', s: 'M0,15 Q5,5 10,15 T20,15 T30,15 T40,15' },
    { n: 'Cosseno', f: 'cos(x)', s: 'M0,5 Q10,25 20,5 T40,5' },
    { n: 'Tangente', f: 'tan(x)', s: 'M5,30 Q10,15 12,0 M18,30 Q20,15 25,5' },
    { n: 'Parábola', f: 'x^2', s: 'M5,5 Q20,35 35,5' },
    { n: 'Cúbica', f: 'x^3', s: 'M5,25 Q15,25 20,15 T35,5' },
    { n: 'Raiz', f: 'sqrt(x)', s: 'M20,25 Q22,10 35,5' },
    { n: 'Absoluto', f: 'abs(x)', s: 'M5,5 L20,25 L35,5' },
    { n: 'Logaritmo', f: 'log(x, 10)', s: 'M20,30 Q22,15 40,12' },
    { n: 'Exponencial', f: '2^x', s: 'M5,28 Q25,25 35,5' },
    { n: 'Recíproca', f: '1/x', s: 'M5,5 Q10,10 18,15 M22,15 Q30,20 35,25' },
    { n: 'Amortecida', f: 'sin(x) * exp(-0.1*x)', s: 'M0,15 Q5,8 10,15 T20,15 T30,15' },
    { n: 'Sigmóide', f: '1 / (1 + exp(-x))', s: 'M5,25 Q20,25 20,15 T35,5' },
    { n: 'Gaussiana', f: 'exp(-x^2)', s: 'M5,28 Q20,5 35,28' },
    { n: 'Linear', f: 'x', s: 'M5,25 L35,5' },
    { n: 'Quadrática', f: 'x^2 - 2*x', s: 'M5,20 Q15,10 25,20 T40,28' },
    { n: 'Sen²(x)', f: 'sin(x)^2', s: 'M0,20 Q5,8 10,20 T20,20 T30,20 T40,20' },
    { n: 'Cos²(x)', f: 'cos(x)^2', s: 'M0,8 Q10,20 20,8 T40,8' },
    { n: 'Arco-seno', f: 'asin(x)', s: 'M5,25 Q20,15 35,5' },
    { n: 'Arco-cosseno', f: 'acos(x)', s: 'M5,5 Q20,15 35,25' },
    { n: 'Arco-tangente', f: 'atan(x)', s: 'M5,28 Q20,15 40,5' },
    { n: 'Hipérbola', f: '1 / (x + 0.1)', s: 'M5,5 Q8,12 10,28 M30,28 Q32,12 35,5' },
    { n: 'Raiz Cúbica', f: 'x^(1/3)', s: 'M5,28 Q20,15 35,2' },
    { n: 'Polinômio 4º', f: 'x^4 - 2*x^2', s: 'M5,8 Q10,25 15,8 Q20,5 25,8 Q30,25 35,8' },
    { n: 'Senoidal 2', f: '2*sin(x)', s: 'M0,15 Q5,0 10,15 T20,15 T30,15 T40,15' },
    { n: 'Exponencial e', f: 'exp(x)', s: 'M5,28 Q15,20 25,8' },
    { n: 'Log Natural', f: 'log(x)', s: 'M5,28 Q15,15 35,5' }
];

function buildModelMenu() {
    const container = document.getElementById('models-dropdown');
    models.forEach(m => {
        const item = document.createElement('div');
        item.className = 'model-item';
        item.onclick = (e) => {
            e.stopPropagation();
            addModel(m.f);
        };
        item.innerHTML = `
            <svg class="model-svg" viewBox="0 0 40 30"><path d="${m.s}" fill="none" stroke="#4a90e2" stroke-width="2.5"/></svg>
            <div class="model-info"><b>${m.n}</b><span>${m.f}</span></div>
        `;
        container.appendChild(item);
    });
}

function showContextMenu(clientX, clientY) {
    const menu = document.getElementById('context-menu');
    menu.style.left = `${clientX}px`;
    menu.style.top = `${clientY}px`;
    menu.classList.remove('hidden');
}

function hideContextMenu() {
    document.getElementById('context-menu').classList.add('hidden');
}

function toggleComparePanel() {
    const panel = document.getElementById('compare-panel');
    panel.classList.toggle('hidden');
    updateCompareList();
    hideContextMenu();
}

function toggleStepMode() {
    stepMode = !stepMode;
    document.getElementById('step-panel').classList.toggle('hidden', !stepMode);
    if (stepMode) updateStepX(stepX);
    renderAll();
    hideContextMenu();
}

function toggleAngleMode() {
    degreesMode = !degreesMode;
    document.getElementById('angle-label').textContent = degreesMode ? 'Graus' : 'Radianos';
    const angleButton = document.getElementById('angle-toggle-button');
    if (angleButton) angleButton.textContent = degreesMode ? 'Usar Radianos' : 'Usar Graus';
    renderAll();
    hideContextMenu();
}

function openAnnotationPanel() {
    const panel = document.getElementById('annotation-panel');
    panel.classList.toggle('hidden');
    updateAnnotationList();
    hideContextMenu();
}

function toggleAnnotationAddMode() {
    annotationAddMode = !annotationAddMode;
    document.getElementById('annotation-mode-status').textContent = annotationAddMode ? 'Ativo' : 'Desativado';
    document.getElementById('annotation-mode-button').textContent = annotationAddMode ? 'Desativar adição' : 'Ativar adição';
}

function selectStartupMode(mode) {
    document.getElementById('startup-menu').classList.add('hidden');
    if (mode === 'step') {
        stepMode = true;
        document.getElementById('step-panel').classList.remove('hidden');
        updateStepX(stepX);
    } else {
        stepMode = false;
        document.getElementById('step-panel').classList.add('hidden');
    }
}
