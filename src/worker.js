// worker.js
console.log('worker');
self.onmessage = function(event) {
   console.log('onmessage');
  const data = event.data;
  // Perform heavy computation
  const result = data * 2; 
  self.postMessage(result); // Send result back to main thread
};