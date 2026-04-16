((window, document, scriptTag, dataLayerName, containerId) => {
  window[dataLayerName] = window[dataLayerName] || [];
  window[dataLayerName].push({
    'gtm.start': Date.now(),
    event: 'gtm.js',
  });

  var firstScript = document.getElementsByTagName(scriptTag)[0];
  var script = document.createElement(scriptTag);
  var dataLayerParam = dataLayerName !== 'dataLayer' ? `&l=${dataLayerName}` : '';

  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}${dataLayerParam}`;

  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  }
})(window, document, 'script', 'dataLayer', 'GTM-5DMGVFZS');
