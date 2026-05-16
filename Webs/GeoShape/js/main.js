const canvas = document.getElementById('shapeCanvas');
const ctx = canvas.getContext('2d');

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
    dynamicSnap: document.getElementById('dynamicSnap'),
    showCentroid: document.getElementById('showCentroid')
};

const labels = {
    vCount: document.getElementById('v-count'),
    rVal: document.getElementById('r-val'),
    rotVal: document.getElementById('rot-val'),
    wVal: document.getElementById('w-val'),
    opVal: document.getElementById('op-val'),
    angleVal: document.getElementById('angle-val'),
    extAngleVal: document.getElementById('ext-angle-val'),
    sideLen: document.getElementById('side-len'),
    perimeter: document.getElementById('perimeter'),
    area: document.getElementById('area'),
    statV: document.getElementById('stat-v'),
    triangleType: document.getElementById('triangle-type')
};

let polygonVertices = [];
let undoStack = [];
let redoStack = [];
let isDragging = false;
let isDraggingShape = false;
let draggedIndex = -1;
let dragOffset = { x: 0, y: 0 };
let currentRotation = 0;
let hoverIndex = -1;
let snappingLine = null;
let isAnimating = false;
let animationFrameId = null;

function saveState() {
    const state = JSON.stringify(polygonVertices);
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === state) return;
    undoStack.push(state);
    if (undoStack.length > 20) undoStack.shift();
    redoStack = [];
}

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.stringify(polygonVertices));
    polygonVertices = JSON.parse(undoStack.pop());
    drawShape();
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.stringify(polygonVertices));
    polygonVertices = JSON.parse(redoStack.pop());
    drawShape();
}

function applySnapping(mx, my, draggedIdx = -1) {
    let nx = mx, ny = my;
    if (inputs.snapGrid.checked) {
        nx = Math.round(nx / 20) * 20;
        ny = Math.round(ny / 20) * 20;
    }
    
    if (inputs.dynamicSnap && inputs.dynamicSnap.checked && polygonVertices.length > 0) {
        let ref = (draggedIdx !== -1) 
            ? polygonVertices[(draggedIdx + polygonVertices.length - 1) % polygonVertices.length]
            : (inputs.freeMode.checked ? polygonVertices[polygonVertices.length - 1] : null);
        
        if (ref) {
            const dx = nx - ref.x, dy = ny - ref.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 20) {
                const angle = Math.atan2(dy, dx);
                const step = Math.PI / 4; // 45 graus
                const snappedAngle = Math.round(angle / step) * step;
                if (Math.abs(angle - snappedAngle) < 0.15) { // Tolerância de aprox. 8°
                    nx = ref.x + dist * Math.cos(snappedAngle);
                    ny = ref.y + dist * Math.sin(snappedAngle);
                    snappingLine = { x1: ref.x, y1: ref.y, x2: nx, y2: ny };
                }
            }
        }
    }
    return { x: nx, y: ny };
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCentroid() {
    if (polygonVertices.length === 0) return { x: 0, y: 0 };
    let x = 0, y = 0;
    polygonVertices.forEach(v => { x += v.x; y += v.y; });
    return { x: x / polygonVertices.length, y: y / polygonVertices.length };
}

function updateHUD(n, internalAngle, externalAngle, area, perimeter) {
    labels.statV.textContent = n;
    labels.vCount.textContent = n;
    labels.rVal.textContent = inputs.radius.value;
    labels.rotVal.textContent = inputs.rotation.value;
    labels.wVal.textContent = inputs.strokeWidth.value;
    labels.opVal.textContent = inputs.opacity.value;
    
    labels.angleVal.textContent = internalAngle.toFixed(1);
    labels.extAngleVal.textContent = externalAngle.toFixed(1);
    labels.sideLen.textContent = n > 0 ? (perimeter/n).toFixed(1) : 0;
    labels.perimeter.textContent = perimeter.toFixed(1);
    labels.area.textContent = area.toFixed(0);
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

function updateVertices() {
    const n = parseInt(inputs.vertices.value);
    const radius = parseInt(inputs.radius.value);
    const baseRotation = parseInt(inputs.rotation.value) * (Math.PI / 180);
    const rotation = baseRotation + currentRotation;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (!inputs.freeMode.checked) {
        polygonVertices = [];
        for (let i = 0; i < n; i++) {
            const angle = (i * 2 * Math.PI) / n - Math.PI / 2 + rotation;
            polygonVertices.push({
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle)
            });
        }
    }
}

function drawShape() {
    const n = polygonVertices.length;
    const isRegular = !inputs.freeMode.checked;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = canvas.offsetWidth || 800;
        canvas.height = canvas.offsetHeight || 600;
    }

    let sideLens = [];
    let angles = [];

    let perimeter = 0;
    for(let i=0; i<n; i++) {
        const v1 = polygonVertices[i];
        const v2 = polygonVertices[(i+1)%n];
        const dist = Math.hypot(v2.x - v1.x, v2.y - v1.y);
        sideLens.push(dist);
        perimeter += dist;
    }

    const internalAngle = n > 2 ? ((n - 2) * 180) / n : 0;
    const externalAngle = n > 2 ? 360 / n : 0;
    const area = calculateArea();
    const centroid = getCentroid();

    updateHUD(n, internalAngle, externalAngle, area, perimeter);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (snappingLine) {
        ctx.beginPath();
        ctx.moveTo(snappingLine.x1, snappingLine.y1);
        ctx.lineTo(snappingLine.x2, snappingLine.y2);
        ctx.strokeStyle = '#4a90e2';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        snappingLine = null;
    }

    if (inputs.showGrid.checked) {
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        for(let i=0; i<=canvas.width; i+=20) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for(let j=0; j<=canvas.height; j+=20) {
            ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
        }
    }

    if (n < 1) return;

    if (inputs.showCircum.checked && isRegular) {
        const radius = parseInt(inputs.radius.value);
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2);
        ctx.strokeStyle = '#ddd'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    }

    if (inputs.showIncircle.checked && isRegular && n > 2) {
        const radius = parseInt(inputs.radius.value);
        const inRadius = radius * Math.cos(Math.PI / n);
        ctx.beginPath(); ctx.arc(cx, cy, inRadius, 0, Math.PI*2);
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

    polygonVertices.forEach((v, i) => {
        if (inputs.showRadial.checked && isRegular) {
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(v.x, v.y);
            ctx.strokeStyle = hexToRgba(inputs.strokeColor.value, 0.3); ctx.lineWidth = 1; ctx.stroke();
        }

        if (inputs.showApothem.checked && isRegular && n > 2) {
            const nextV = polygonVertices[(i + 1) % n];
            const midX = (v.x + nextV.x) / 2;
            const midY = (v.y + nextV.y) / 2;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(midX, midY);
            ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 1; ctx.stroke();
        }

        if (inputs.showPoints.checked) {
            ctx.beginPath(); ctx.arc(v.x, v.y, 4, 0, Math.PI*2);
            ctx.fillStyle = '#ff6b6b'; ctx.fill();
        }

        if (inputs.showInternal.checked && n > 2) {
            ctx.font = 'bold 11px Segoe UI';
            ctx.textAlign = 'center';
            
            let angleVal = 0;
            if (isRegular) {
                angleVal = internalAngle;
            } else {
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


            if (!isRegular) {
                const prev = polygonVertices[(i + n - 1) % n];
                const next = polygonVertices[(i + 1) % n];
                const startAng = Math.atan2(prev.y - v.y, prev.x - v.x);
                const endAng = Math.atan2(next.y - v.y, next.x - v.x);
                ctx.beginPath();
                ctx.arc(v.x, v.y, 15, startAng, endAng);
                ctx.strokeStyle = hexToRgba(inputs.strokeColor.value, 0.4);
                ctx.stroke();
            }
        }

        // Labels de Medida nos Lados (Nova Feature)
        if (n > 1) {
            const nextV = polygonVertices[(i + 1) % n];
            if (i < n - 1 || n > 2) {
                const midX = (v.x + nextV.x) / 2;
                const midY = (v.y + nextV.y) / 2;
                const d = Math.hypot(nextV.x - v.x, nextV.y - v.y);
                ctx.save();
                ctx.fillStyle = "#666";
                ctx.font = "9px Arial";
                ctx.fillText(d.toFixed(0), midX, midY - 5);
                ctx.restore();
            }
        }

        if (inputs.showExternal.checked && n > 2) {
            const prev = polygonVertices[(i + n - 1) % n];
            
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

        if (i === hoverIndex) {
            ctx.beginPath(); ctx.arc(v.x, v.y, 8, 0, Math.PI*2);
            ctx.strokeStyle = '#4a90e2'; ctx.lineWidth = 2; ctx.stroke();
        }
    });

    if (n === 3) {
        const [s1, s2, s3] = sideLens;
        const tolS = 3;
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

        labels.triangleType.textContent = `${sType} / ${aType}`;
    } else {
        labels.triangleType.textContent = "-";
    }

    if (inputs.showCentroid.checked) {
        ctx.beginPath(); ctx.arc(centroid.x, centroid.y, 5, 0, Math.PI*2);
        ctx.fillStyle = '#2ecc71'; ctx.fill();
        ctx.fillText("Centróide", centroid.x + 10, centroid.y);
    }

    if (isAnimating) {
        currentRotation += 0.01;
        if (!inputs.freeMode.checked) updateVertices();
        animationFrameId = requestAnimationFrame(drawShape);
    }
}

function toggleAnimation() {
    isAnimating = !isAnimating;
    if (isAnimating) {
        drawShape();
    } else {
        cancelAnimationFrame(animationFrameId);
    }
}

function exportSVG() {
    const n = polygonVertices.length;
    if (n < 2) return;
    
    let svgPoints = polygonVertices.map(v => `${v.x},${v.y}`).join(' ');
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
        <polygon points="${svgPoints}" 
                 fill="${inputs.showFill.checked ? inputs.fillColor.value : 'none'}" 
                 fill-opacity="${inputs.opacity.value}"
                 stroke="${inputs.strokeColor.value}" 
                 stroke-width="${inputs.strokeWidth.value}" />
    </svg>`;
    
    const blob = new Blob([svgContent], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'geoshape.svg';
    link.click();
}

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) return;
    
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found = -1;
    polygonVertices.forEach((v, i) => {
        const dist = Math.hypot(v.x - mx, v.y - my);
        if (dist < 15) {
            saveState();
            isDragging = true;
            draggedIndex = i;
            found = i;
        }
    });

    if (found === -1 && inputs.freeMode.checked) {
        saveState();
        // Se clicou no corpo do polígono (e não num ponto), arrasta o polígono todo
        const centroid = getCentroid();
        const distToCenter = Math.hypot(centroid.x - mx, centroid.y - my);
        if (distToCenter < 50 && polygonVertices.length > 2) {
            isDraggingShape = true;
            dragOffset = { x: mx - centroid.x, y: my - centroid.y };
        } else {
            const snapped = applySnapping(mx, my);
            polygonVertices.push({ x: snapped.x, y: snapped.y });
        }
    }
    drawShape();
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!inputs.freeMode.checked) return;
    
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    polygonVertices.forEach((v, i) => {
        const dist = Math.hypot(v.x - mx, v.y - my);
        if (dist < 15) {
            saveState();
            polygonVertices.splice(i, 1);
            drawShape();
        }
    });
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    hoverIndex = -1;
    polygonVertices.forEach((v, i) => {
        if (Math.hypot(v.x - mx, v.y - my) < 15) hoverIndex = i;
    });

    if (isDragging) {
        const snapped = applySnapping(mx, my, draggedIndex);
        polygonVertices[draggedIndex].x = snapped.x;
        polygonVertices[draggedIndex].y = snapped.y;
    } else if (isDraggingShape) {
        const centroid = getCentroid();
        const dx = mx - dragOffset.x - centroid.x;
        const dy = my - dragOffset.y - centroid.y;
        polygonVertices.forEach(v => { v.x += dx; v.y += dy; });
    } else if (inputs.freeMode.checked && polygonVertices.length > 0) {
        applySnapping(mx, my);
    }

    drawShape();
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    draggedIndex = -1;
});

window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
    if (e.key === 'Delete') { e.preventDefault(); clearCanvas(); }
});

function clearCanvas() { polygonVertices = []; drawShape(); }
function resetDefaults() { location.reload(); }
function exportPNG() { const link = document.createElement('a'); link.download = 'polygon.png'; link.href = canvas.toDataURL(); link.click(); }

inputs.freeMode.addEventListener('change', () => {
    saveState();
    if (!inputs.freeMode.checked) updateVertices();
    drawShape();
});

Object.keys(inputs).forEach(key => {
    if (inputs[key]) {
        inputs[key].addEventListener('input', () => {
            if (!isDragging) updateVertices();
            drawShape();
        });
    }
});
updateVertices();
drawShape();
