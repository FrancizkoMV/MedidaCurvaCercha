Chart.register(ChartDataLabels);

let chartCompletaInstance = null;
let chartParcialInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  renderizar();
  cargarHistorial();

  document.getElementById('btnProcesar').addEventListener('click', renderizar);
  document.getElementById('btnGuardar').addEventListener('click', guardarRegistro);
  document.getElementById('btnExportarCSV').addEventListener('click', exportarCSV);
  document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);
});

// Función para calcular la longitud de la línea (Longitud de Arco)
function calcularLongitudLinea(puntosX, puntosY) {
  let longitudArc = 0;
  for (let i = 0; i < puntosY.length - 1; i++) {
    const dx = puntosX[i + 1] - puntosX[i];
    const dy = puntosY[i + 1] - puntosY[i];
    longitudArc += Math.sqrt(dx * dx + dy * dy);
  }
  return longitudArc;
}

function obtenerDatosFormatos() {
  const rawText = document.getElementById('puntosInput').value;
  const valoresY = rawText.split(',')
    .map(val => parseFloat(val.trim()))
    .filter(val => !isNaN(val));

  const total = valoresY.length;
  const valoresX = valoresY.map((_, idx) => idx * 0.5); // Paso horizontal (ej. 0.5m)
  const labelsX = valoresX.map(val => val.toFixed(2));

  const puntoMedioIdx = Math.floor(total / 2);

  // Cálculo de la longitud de la línea
  const longitudTotal = calcularLongitudLinea(valoresX, valoresY);
  const anchoBase = valoresX[total - 1] - valoresX[0];
  const alturaMax = Math.max(...valoresY);

  return {
    nombre: document.getElementById('nombreBote').value || 'Muestra',
    labels: labelsX,
    datosX: valoresX,
    datosY: valoresY,
    labelsParcial: labelsX.slice(0, puntoMedioIdx + 1),
    datosYParcial: valoresY.slice(0, puntoMedioIdx + 1),
    puntoMedioIdx,
    longitudTotal,
    anchoBase,
    alturaMax
  };
}

function crearConfiguracionGrafica(labels, datos, titulo, esParcial, puntoMedioIdx) {
  const totalPuntos = datos.length;

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: titulo,
        data: datos,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: datos.map((_, i) => (i === puntoMedioIdx ? '#f59e0b' : '#2563eb'))
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        datalabels: {
          display: function(context) {
            const index = context.dataIndex;
            return index % 3 === 0 || index === totalPuntos - 1 || index === 0 || index === puntoMedioIdx;
          },
          font: { size: 9, weight: 'bold' },
          color: '#1e293b',
          align: 'top',
          offset: 4,
          formatter: (value) => value.toFixed(2)
        }
      },
      scales: {
        x: {
          ticks: {
            font: { size: 8 },
            maxRotation: 45,
            autoSkip: true,
            maxTicksLimit: 10
          },
          grid: { color: '#f1f5f9' }
        },
        y: {
          ticks: { font: { size: 9 }, maxTicksLimit: 6 },
          grid: { color: '#e2e8f0' }
        }
      }
    }
  };
}

function renderizar() {
  const data = obtenerDatosFormatos();

  // Actualizar métricas visuales en pantalla
  document.getElementById('longitudTotal').textContent = `${data.longitudTotal.toFixed(2)} m`;
  document.getElementById('anchoBase').textContent = `${data.anchoBase.toFixed(2)} m`;
  document.getElementById('alturaMax').textContent = `${data.alturaMax.toFixed(2)} m`;

  if (chartCompletaInstance) chartCompletaInstance.destroy();
  if (chartParcialInstance) chartParcialInstance.destroy();

  const ctx1 = document.getElementById('chartCompleta').getContext('2d');
  const ctx2 = document.getElementById('chartParcial').getContext('2d');

  chartCompletaInstance = new Chart(ctx1, crearConfiguracionGrafica(
    data.labels, data.datosY, 'Vista Completa', false, data.puntoMedioIdx
  ));

  chartParcialInstance = new Chart(ctx2, crearConfiguracionGrafica(
    data.labelsParcial, data.datosYParcial, 'Vista Parcial', true, data.puntoMedioIdx
  ));
}

// ----------------------------------------------------------------
// HISTORIAL DE DATOS (LocalStorage)
// ----------------------------------------------------------------
function guardarRegistro() {
  const data = obtenerDatosFormatos();
  const historial = JSON.parse(localStorage.getItem('historial_nfc') || '[]');

  const nuevoItem = {
    id: Date.now(),
    nombre: data.nombre,
    fecha: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
    valores: document.getElementById('puntosInput').value,
    longitudTotal: data.longitudTotal.toFixed(2)
  };

  historial.unshift(nuevoItem);
  localStorage.setItem('historial_nfc', JSON.stringify(historial));
  cargarHistorial();
  alert(`¡Medición guardada! Longitud total de línea: ${data.longitudTotal.toFixed(2)} m`);
}

function cargarHistorial() {
  const contenedor = document.getElementById('historialLista');
  const historial = JSON.parse(localStorage.getItem('historial_nfc') || '[]');

  if (historial.length === 0) {
    contenedor.innerHTML = '<p class="text-muted">No hay registros guardados localmente.</p>';
    return;
  }

  contenedor.innerHTML = historial.map(item => `
    <div class="historial-item">
      <div>
        <strong>${item.nombre}</strong> — <span style="color: #2563eb;">Longitud: ${item.longitudTotal}m</span> <br>
        <small class="text-muted">${item.fecha}</small>
      </div>
      <button class="btn secondary" style="padding: 0.3rem 0.6rem; flex: none;" onclick="cargarItem(${item.id})">Cargar</button>
    </div>
  `).join('');
}

window.cargarItem = function(id) {
  const historial = JSON.parse(localStorage.getItem('historial_nfc') || '[]');
  const item = historial.find(i => i.id === id);
  if (item) {
    document.getElementById('nombreBote').value = item.nombre;
    document.getElementById('puntosInput').value = item.valores;
    renderizar();
  }
};

// ----------------------------------------------------------------
// EXPORTACIÓN A CSV Y PDF
// ----------------------------------------------------------------
function exportarCSV() {
  const data = obtenerDatosFormatos();
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += `Reporte: ${data.nombre}\n`;
  csvContent += `Longitud Total de Linea (Arco):,${data.longitudTotal.toFixed(2)} m\n`;
  csvContent += `Ancho Base (X_final - X_0):,${data.anchoBase.toFixed(2)} m\n`;
  csvContent += `Altura Maxima:,${data.alturaMax.toFixed(2)} m\n\n`;
  csvContent += "Punto,X,Y\n";

  data.datosY.forEach((y, i) => {
    csvContent += `${i + 1},${data.labels[i]},${y}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${data.nombre.replace(/\s+/g, '_')}_datos.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const data = obtenerDatosFormatos();

  doc.setFontSize(16);
  doc.text(`Reporte de Estructura: ${data.nombre}`, 14, 18);
  
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 25);
  
  // Resaltar Longitud en el PDF
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(`Longitud Total de Linea (X_0 a X_final): ${data.longitudTotal.toFixed(2)} m`, 14, 33);
  doc.setTextColor(0, 0, 0);
  doc.text(`Ancho Horizontal: ${data.anchoBase.toFixed(2)} m  |  Altura Maxima: ${data.alturaMax.toFixed(2)} m`, 14, 40);

  // Capturar primera gráfica
  const imgData1 = chartCompletaInstance.toBase64Image();
  doc.addImage(imgData1, 'PNG', 14, 46, 180, 85);

  // Capturar segunda gráfica
  const imgData2 = chartParcialInstance.toBase64Image();
  doc.addImage(imgData2, 'PNG', 14, 136, 180, 85);

  doc.save(`${data.nombre.replace(/\s+/g, '_')}_Reporte.pdf`);
}