let logBuffer = [];
let isDebugMode = false;
let exportButton = null;

export function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  logBuffer.push({ timestamp, message, type });
  if (typeof window._debugLogs === 'undefined') {
    window._debugLogs = [];
  }
  window._debugLogs.push({ timestamp, message, type });
}

export function logData(label, data) {
  let str;
  try {
    str = JSON.stringify(data, null, 2);
  } catch (e) {
    str = String(data);
  }
  log(`${label}: ${str}`, 'info');
}

export function logError(message, error) {
  log(`${message}: ${error?.message || error}`, 'error');
}

export function logSuccess(message) {
  log(`✅ ${message}`, 'success');
}

export function logWarn(message) {
  log(`⚠️ ${message}`, 'warn');
}

export function startDebugMode() {
  if (isDebugMode) return;
  isDebugMode = true;
  
  if (exportButton) return;
  
  exportButton = document.createElement('button');
  exportButton.textContent = '🐛 EXPORTAR LOGS';
  exportButton.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: 100000;
    background: #14b8a6;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 40px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    font-family: monospace;
  `;
  
  exportButton.onclick = () => {
    const content = logBuffer.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug_logs_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`✅ Logs exportados! Total: ${logBuffer.length} líneas`);
  };
  
  document.body.appendChild(exportButton);
  logSuccess('Debug mode activado - Botón de exportar en esquina inferior derecha');
}

export function stopDebugMode() {
  isDebugMode = false;
  if (exportButton) {
    exportButton.remove();
    exportButton = null;
  }
  logBuffer = [];
}

export function getLogs() {
  return [...logBuffer];
}

export const debug = {
  log,
  logData,
  logError,
  logSuccess,
  logWarn,
  startDebugMode,
  stopDebugMode,
  getLogs
};

export default debug;