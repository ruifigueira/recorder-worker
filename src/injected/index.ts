import * as rrweb from 'rrweb';

declare global {
  interface Window {
    __rrwebInstalled?: boolean;
    __rrwebQueue?: any[];
    sendToWorker?: (event: any) => void;
  }
}

if (!window.__rrwebInstalled) {
  window.__rrwebInstalled = true;
  
  const queue: any[] = [];
  function emit(ev: any): void {
    if (window.sendToWorker) window.sendToWorker(ev);
    else queue.push(ev);
  }
  // Expose for debugging if needed
  window.__rrwebQueue = queue;
  
  try {
    rrweb.record({
      emit,
      // Optional knobs:
      // recordCanvas: true,
      // inlineStylesheet: true,
      // collectFonts: true,
    });
  } catch (e) {
    console.error('rrweb.record failed in init script:', e);
  }
  
  // Flush buffered events when sendToWorker appears
  const flush = () => {
    if (window.sendToWorker && queue.length) {
      for (const ev of queue) window.sendToWorker(ev);
      queue.length = 0;
    }
  };
  const iv = setInterval(flush, 500);
  window.addEventListener('beforeunload', () => { clearInterval(iv); flush(); });
}