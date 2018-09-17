//######################################################################################################## 
//#                                                                                                    #\\
//#                                      Wetland Hydrology Library                                     #\\
//#                                                                                                    #\\
//########################################################################################################


// date: 2018-08-04
// author: Qiusheng Wu | wqs@binghamton.edu
// website: https://wetlands.io | https://GIShub.org


// visualization parameters
exports.viz = {
  'nir': {bands: ['N', 'R', 'G']},
  'rgb': {bands: ['R', 'G', 'B']},
  'water': {palette: ['0000FF']},
  'ndwi': {palette: ['#ece7f2', '#d0d1e6', '#a6bddb', '#74a9cf', '#3690c0', '#0570b0', '#045a8d', '#023858']},
  'ndvi': {palette: ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850']},
  'dem': {min: 100, max: 1000}
};


// Add vector layer to map
exports.addVectorLayer = function(fc, width, color, name) {
  Map.addLayer(ee.Image().paint(fc, 0, width), {palette: [color]}, name);
};


// All image collection to map
exports.addImagesToMap = function(collection, layer_prefix, viz, iter, shown){
  var size = collection.size();
  var images = collection.toList(size);
  var yearList = ee.List(collection.aggregate_array('system:time_start'));
  var years = yearList.map(function(y){
    return ee.Date(y).get('year');
  });
  // years = years.getInfo();
  for(var i = 0; i < iter; i++) {
    var image = ee.Image(images.get(i));
    // var date = ee.Date(image.get('system:time_start'));
    // var year = ee.String(date.get('year')).getInfo();
    var index = i + 1;
    var layer_name = layer_prefix + ' Year ' + index.toString();
    if (layer_prefix == 'KMeans') {
      Map.addLayer(image.randomVisualizer(), {}, layer_name, shown);
    } else {
      Map.addLayer(image, viz, layer_name, shown);
    }
  }
};


exports.nwi_add_color = function(fc) {
  var emergent = ee.FeatureCollection(fc.filter(ee.Filter.eq('WETLAND_TY', 'Freshwater Emergent Wetland')));
  emergent = emergent.map(function(f) {
    return f.set('R', 127).set('G', 195).set('B', 28);
  });
  // print(emergent.first())

  var forested = fc.filter(ee.Filter.eq('WETLAND_TY', 'Freshwater Forested/Shrub Wetland'));
  forested = forested.map(function(f) {
    return f.set('R', 0).set('G', 136).set('B', 55);
  });
  
  var pond = fc.filter(ee.Filter.eq('WETLAND_TY', 'Freshwater Pond'));
  pond = pond.map(function(f) {
    return f.set('R', 104).set('G', 140).set('B', 192);
  });
  
  var lake = fc.filter(ee.Filter.eq('WETLAND_TY', 'Lake'));
  lake = lake.map(function(f) {
    return f.set('R', 19).set('G', 0).set('B', 124);
  });

  fc = ee.FeatureCollection(emergent.merge(forested).merge(pond).merge(lake));
  
  var base = ee.Image(0).mask(0).toInt8();
  var img = base.paint(fc, 'R')
  .addBands(base.paint(fc, 'G')
  .addBands(base.paint(fc, 'B')));
  return img;
  
};
