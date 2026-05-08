const canvas = document.getElementById('shapeCanvas');
const ctx = canvas.getContext('2d');

// Mapeamento de inputs
const inputs = {
    vertices: document.getElementById('vertices'),
    radius: document.getElementById('radius'),
    rotation: document.getElementById('rotation'),
    strokeColor: document.getElementById('strokeColor'),
    fillColor: document.getElementById('fillColor'),
    strokeWidth: document.getElementById('strokeWidth'),
    opacity: document.getElementById('opacity'),
    showFill: document.getElementById('showFill'),
    showPoints: document.getElementById('showPoints'),
    showRadial: document.getElementById('showRadial'),
    showStar: document.getElementById('showStar'),
    showCircum: document.getElementById('showCircum'),
    showIncircle: document.getElementById('showIncircle'),
    showApothem: document.getElementById('showApothem'),
    showExternal: document.getElementById('showExternal'),
    showInternal: document.getElementById('showInternal'),
    showGrid: document.getElementById('showGrid'),
    freeMode: document.getElementById('freeMode'),
    snapGrid: document.getElementById('snapGrid'),
    showCentroid: document.getElementById('showCentroid')
};

let polygonVertices = [];
let isDragging = false;
let draggedIndex = -1;
let currentRotation = 0;

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updateVertices() {
    const n = parseInt(inputs.vertices.value);
    const radius = parseInt(inputs.radius.value);
    const baseRotation = parseInt(inputs.rotation.value) * (Math.PI / 180);
    const rotation = baseRotation + currentRotation;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    if (!inputs.freeMode.checked) {
        polygonVertices = [];
        for (let i = 0; i < n; i++) {
            const angle = (i * 2 * Math.PI) / n - Math.PI / 2 + rotation;
            polygonVertices.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            });
        }
    }
}

function getCentroid() {
    if (polygonVertices.length === 0) return { x: 0, y: 0 };
    let x = 0, y = 0;
    polygonVertices.forEach(v => { x += v.x; y += v.y; });
    return { x: x / polygonVertices.length, y: y / polygonVertices.length };
}

function calculateArea() {
    let area = 0;
    const n = polygonVertices.length;
    for (let i = 0; i < n; i++) {
        let j = (i + 1) % n;
        area += polygonVertices[i].x * polygonVertices[j].y;
        area -= polygonVertices[j].x * polygonVertices[i].y;
    }
    return Math.abs(area) / 2;
}

function drawShape() {
    const n = polygonVertices.length;
    const isRegular = !inputs.freeMode.checked;

    // Variáveis para análise do triângulo
    let sideLens = [];
    let angles = [];

    // Cálculos de Perímetro e Lados
    let perimeter = 0;
    for(let i=0; i<n; i++) {
        const v1 = polygonVertices[i];
        const v2 = polygonVertices[(i+1)%n];
        const dist = Math.sqrt((v2.x - v1.x)**2 + (v2.y - v1.y)**2);
        sideLens.push(dist);
        perimeter += dist;
    }

    const internalAngle = n > 2 ? ((n - 2) * 180) / n : 0;
    const area = calculateArea();
    const centroid = getCentroid();

    // UI Update
    document.getElementById('stat-v').textContent = n;
    document.getElementById('v-count').textContent = n;
    document.getElementById('r-val').textContent = inputs.radius.value;
    
    document.getElementById('angle-val').textContent = internalAngle.toFixed(1);
    document.getElementById('side-len').textContent = n > 0 ? (perimeter/n).toFixed(1) : 0;
    document.getElementById('perimeter').textContent = perimeter.toFixed(1);
    document.getElementById('area').textContent = area.toFixed(0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Grade (Feature 15)
    if (inputs.showGrid.checked) {
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        for(let i=0; i<canvas.width; i+=20) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
        }
    }

    if (n < 1) return;

    // 2. Circunferências (Feature 12, 13)
    if (inputs.showCircum.checked && isRegular) {
        const radius = parseInt(inputs.radius.value);
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI*2);
        ctx.strokeStyle = '#ddd'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    }

    // 3. Estrela / Conectividade Total (Feature 11)
    if (inputs.showStar.checked && n > 2) {
        ctx.strokeStyle = hexToRgba(inputs.strokeColor.value, 0.2);
        ctx.lineWidth = 1;
        for(let i=0; i<n; i++) {
            for(let j=i+1; j<n; j++) {
                ctx.beginPath(); ctx.moveTo(polygonVertices[i].x, polygonVertices[i].y);
                ctx.lineTo(polygonVertices[j].x, polygonVertices[j].y); ctx.stroke();
            }
        }
    }

    // 4. Desenhar Polígono Principal
    if (n > 1) {
        ctx.beginPath();
        polygonVertices.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
        if (n > 2) ctx.closePath();
    }

    if (inputs.showFill.checked) {
        ctx.fillStyle = hexToRgba(inputs.fillColor.value, inputs.opacity.value);
        ctx.fill();
    }

    ctx.strokeStyle = inputs.strokeColor.value;
    ctx.lineWidth = inputs.strokeWidth.value;
    ctx.lineJoin = 'round'; 
    ctx.stroke();

    // 5. Radiais e Apótema (Feature 10, 14)
    polygonVertices.forEach((v, i) => {
        if (inputs.showRadial.checked && isRegular) {
            ctx.beginPath(); ctx.moveTo(canvas.width/2, canvas.height/2); ctx.lineTo(v.x, v.y);
            ctx.strokeStyle = hexToRgba(inputs.strokeColor.value, 0.3); ctx.lineWidth = 1; ctx.stroke();
        }
        if (inputs.showPoints.checked) {
            ctx.beginPath(); ctx.arc(v.x, v.y, 4, 0, Math.PI*2);
            ctx.fillStyle = '#ff6b6b'; ctx.fill();
        }

        // Ângulos Internos Automáticos no Canvas
        if (inputs.showInternal.checked && n > 2) {
            ctx.font = 'bold 11px Segoe UI';
            ctx.textAlign = 'center';
            
            let angleVal = 0;
            if (isRegular) {
                angleVal = internalAngle;
            } else {
                // Cálculo vetorial para polígonos irregulares
                const prev = polygonVertices[(i + n - 1) % n];
                const next = polygonVertices[(i + 1) % n];
                const a1 = Math.atan2(prev.y - v.y, prev.x - v.x);
                const a2 = Math.atan2(next.y - v.y, next.x - v.x);
                let diff = a2 - a1;
                while (diff < 0) diff += Math.PI * 2;
                angleVal = (diff * 180) / Math.PI;
                if (angleVal > 180) angleVal = 360 - angleVal; // Mantém o ângulo interno convexo
            }

            angles.push(angleVal);

            ctx.fillStyle = angleVal > 90 ? '#ff0000' : inputs.strokeColor.value;
            const dist = 25; // Distância do texto ao ponto
            const angleToCenter = Math.atan2(centroid.y - v.y, centroid.x - v.x);
            ctx.fillText(angleVal.toFixed(1) + "°", v.x + Math.cos(angleToCenter) * dist, v.y + Math.sin(angleToCenter) * dist + 4);
        }

        // Ângulos Externos (Novo)
        if (inputs.showExternal.checked && n > 2) {
            const prev = polygonVertices[(i + n - 1) % n];
            
            // Vetor da aresta anterior
            const dx = v.x - prev.x;
            const dy = v.y - prev.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            
            // Extensão da linha
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(v.x, v.y);
            ctx.lineTo(v.x + (dx/len) * 50, v.y + (dy/len) * 50);
            ctx.strokeStyle = '#999';
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });

    // Classificação de Triângulos (Identificação de Lados e Ângulos)
    const typeDisplay = document.getElementById('triangle-type');
    if (n === 3) {
        // Lados (Equilátero, Isósceles, Escaleno)
        const [s1, s2, s3] = sideLens;
        const tolS = 3; // Tolerância em pixels para considerar lados iguais
        let sType = "Escaleno";
        const eq12 = Math.abs(s1 - s2) < tolS;
        const eq23 = Math.abs(s2 - s3) < tolS;
        const eq31 = Math.abs(s3 - s1) < tolS;
        
        if (eq12 && eq23) sType = "Equilátero";
        else if (eq12 || eq23 || eq31) sType = "Isósceles";

        // Ângulos (Agudo, Reto, Obtuso)
        const maxAngle = Math.max(...angles);
        const tolA = 1.5; // Tolerância em graus
        let aType = "Agudo";
        if (Math.abs(maxAngle - 90) < tolA) aType = "Reto";
        else if (maxAngle > 90 + tolA) aType = "Obtuso";

        typeDisplay.textContent = `${sType} / ${aType}`;
    } else {
        typeDisplay.textContent = "-";
    }

    if (inputs.showCentroid.checked) {
        ctx.beginPath(); ctx.arc(centroid.x, centroid.y, 5, 0, Math.PI*2);
        ctx.fillStyle = '#2ecc71'; ctx.fill();
        ctx.fillText("Centróide", centroid.x + 10, centroid.y);
    }
}

// Eventos de Mouse para mover pontos
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    let my = e.clientY - rect.top;

    if (inputs.snapGrid.checked) {
        mx = Math.round(mx / 20) * 20;
        my = Math.round(my / 20) * 20;
    }

    // No Modo Livre, se NÃO estiver segurando Ctrl, adiciona ponto.
    // Se segurar Ctrl ou se não estiver no Modo Livre, tenta arrastar.
    if (inputs.freeMode.checked && !e.ctrlKey) {
        polygonVertices.push({ x: mx, y: my });
        drawShape();
        return;
    }

    polygonVertices.forEach((v, i) => {
        const dist = Math.sqrt((v.x - mx)**2 + (v.y - my)**2);
        if (dist < 15) {
            isDragging = true;
            draggedIndex = i;
        }
    });
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    let my = e.clientY - rect.top;

    if (inputs.snapGrid.checked) {
        mx = Math.round(mx / 20) * 20;
        my = Math.round(my / 20) * 20;
    }

    polygonVertices[draggedIndex].x = mx;
    polygonVertices[draggedIndex].y = my;
    drawShape();
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    draggedIndex = -1;
});

function clearCanvas() { polygonVertices = []; drawShape(); }
function resetDefaults() { location.reload(); }
function exportPNG() { const link = document.createElement('a'); link.download = 'polygon.png'; link.href = canvas.toDataURL(); link.click(); }

inputs.freeMode.addEventListener('change', () => {
    if (!inputs.freeMode.checked) updateVertices();
    drawShape();
});

Object.keys(inputs).forEach(key => inputs[key].addEventListener('input', () => {
    if (!isDragging) updateVertices();
    drawShape();
}));
updateVertices();
drawShape();
