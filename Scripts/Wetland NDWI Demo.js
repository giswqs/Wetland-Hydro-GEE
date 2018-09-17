var image = ee.Image('USDA/NAIP/DOQQ/m_4609915_sw_14_1_20100629');

var vis = {bands: ['N', 'R', 'G']};

var ndwi = image.normalizedDifference(['G', 'N']);
var ndwiViz = {min: 0.2, max: 1, palette: ['00FFFF', '0000FF']};
var ndwiMasked = ndwi.updateMask(ndwi.gte(0.2));
var ndwi_bin = ndwiMasked.gt(0);

Map.centerObject(image, 12);
Map.addLayer(image, vis, 'NAIP');
Map.addLayer(ndwiMasked, ndwiViz, 'NDWI masked');

var patch_size = ndwi_bin.connectedPixelCount(500, true);
var large_patches = patch_size.eq(500);
large_patches = large_patches.updateMask(large_patches);
//Map.addLayer(large_patches, {}, 'Large patches');

var opened = large_patches.focal_min(1).focal_max(1);
//Map.addLayer(opened, {}, 'opened');

var fc = opened.reduceToVectors({eightConnected: true, maxPixels: 50000000});
Map.addLayer(fc, {}, 'vector');

Export.image.toDrive({
  image: image,
  description: 'naip5',
  scale: 5,
  //region: geometry
});

Export.table.toDrive({
  collection: fc,
  description:'water',
  fileFormat: 'KML'
});



