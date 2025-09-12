// Estrae il parametro 'id' dalla query string dell'URL corrente
function getSerieIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}
