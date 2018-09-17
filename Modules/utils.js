//######################################################################################################## 
//#                                                                                                    #\\
//#                                      Wetland Hydrology Library                                     #\\
//#                                                                                                    #\\
//########################################################################################################


// date: 2018-08-04
// author: Qiusheng Wu | wqs@binghamton.edu
// website: https://wetlands.io | https://GIShub.org


// Compute area in square meters
exports.vecArea = function(f) {
  // Compute area in square meters.  Convert to hectares.
  var areaSqm = f.area();

  // A new property called 'area' will be set on each feature.
  return f.set({area: areaSqm});
};


// Compute area in square kilometers
exports.vecAreaSqkm = function(f) {
  // Compute area in square meters.  Convert to hectares.
  var areaSqkm = f.area().divide(1000 * 1000);

  // A new property called 'area' will be set on each feature.
  return f.set({area: areaSqkm});
};


// Compute area in hectares
exports.vecAreaHa = function(f) {
  // Compute area in square meters.  Convert to hectares.
  var areaHa = f.area(1).divide(100 * 100);

  // A new property called 'area' will be set on each feature.
  return f.set({area: areaHa});
};


exports.imgAreaHa = function(img, geometry, scale) {
  var pixelArea = img.gt(0).multiply(ee.Image.pixelArea()).divide(10000);  
  var imgArea = pixelArea.reduceRegion({
    geometry: geometry,
    reducer: ee.Reducer.sum(),
    scale: scale,
    maxPixels: 1e9
  });
  return imgArea;
};

exports.getYear = function(date) {
  return ee.Date(date).get('year');
};

// Convert string to number
exports.stringToNumber = function(str) {
  return ee.Number.parse(str);
};


//Calculate array sum
exports.arraySum = function(arr) {
  return ee.Array(arr).accum(0).get([-1]);
};


// Calculate array mean
exports.arrayMean = function(arr) {
  var sum = ee.Array(arr).accum(0).get([-1]);
  var size = arr.length();
  return ee.Number(sum.divide(size));
};

// Create NAIP mosaic for a specified year   
exports.annualNAIP = function(year, geometry){
  var start_date = ee.Date.fromYMD(year, 1, 1);
  var end_date = ee.Date.fromYMD(year, 12, 31);
  var collection = ee.ImageCollection('USDA/NAIP/DOQQ')
    .filterDate(start_date, end_date)
    .filterBounds(geometry);
    
  var time_start = ee.Date(ee.List(collection.aggregate_array('system:time_start')).sort().get(0));
  var time_end = ee.Date(ee.List(collection.aggregate_array('system:time_end')).sort().get(-1));
  var image = ee.Image(collection.mosaic().clip(geometry));
  var NDWI = ee.Image(image).normalizedDifference(['G', 'N']).select(['nd'], ['ndwi']);
  var NDVI = ee.Image(image).normalizedDifference(['N', 'R']).select(['nd'], ['ndvi']);
  image = image.addBands(NDWI);
  image = image.addBands(NDVI);
  return image.set({'system:time_start': time_start, 'system:time_end': time_end}); 

};


// Find all available NAIP images for a geometry
exports.findNAIP = function(geometry) {
  var collection = ee.ImageCollection('USDA/NAIP/DOQQ')
    .filterBounds(geometry.centroid())
    .filter(ee.Filter.listContains("system:band_names", "N"));
    
  var yearList = ee.List(collection.distinct(['system:time_start']).aggregate_array('system:time_start'));
  var years = yearList.map(function(y){
    return ee.Date(y).get('year');
  });
  // print('Available NAIP years with NIR band:', years);
  var NAIPAnnual= function(year){
    var start_date = ee.Date.fromYMD(year, 1, 1);
    var end_date = ee.Date.fromYMD(year, 12, 31);
    var collection = ee.ImageCollection('USDA/NAIP/DOQQ')
      .filterDate(start_date, end_date)
      .filterBounds(geometry);
    var time_start = ee.Date(ee.List(collection.aggregate_array('system:time_start')).sort().get(0));
    var time_end = ee.Date(ee.List(collection.aggregate_array('system:time_end')).sort().get(-1));
    var image = ee.Image(collection.mosaic().clip(geometry));
    var NDWI = ee.Image(image).normalizedDifference(['G', 'N']).select(['nd'], ['ndwi']);
    var NDVI = ee.Image(image).normalizedDifference(['N', 'R']).select(['nd'], ['ndvi']);
    image = image.addBands(NDWI);
    image = image.addBands(NDVI);
    return image.set({'system:time_start': time_start, 'system:time_end': time_end}); 
  };
  
  var naip = ee.ImageCollection(years.map(NAIPAnnual));
  return naip;
};


// select US state by name
exports.selectState = function(state_name) {
  var states = ee.FeatureCollection('ft:1fRY18cjsHzDgGiJiS2nnpUU3v9JPDc2HNaR7Xk8');
  return states.filter(ee.Filter.eq('Name', state_name));
};


// Get NWI by HUC
exports.filterNWI = function(HUC08_Id, geometry) {
    var nwi_asset_prefix = 'users/wqs/NWI-HU8/HU8_';
    var nwi_asset_suffix = '_Wetlands';
    var nwi_asset_path = nwi_asset_prefix + HUC08_Id + nwi_asset_suffix;
    var nwi_huc = ee.FeatureCollection(nwi_asset_path).filterBounds(geometry)
      .filter(ee.Filter.notEquals({leftField: 'WETLAND_TY', rightValue: 'Riverine'}));
    return nwi_huc;
};


// Find HUC08 intersecting a geometry
var filterHUC08 = function(geometry) {
  var USGS_HUC08 = ee.FeatureCollection('USGS/WBD/2017/HUC08');   // Subbasins
  var HUC08 = USGS_HUC08.filterBounds(geometry);
  return HUC08;
};
exports.filterHUC08 = filterHUC08;


// Find HUC10 intersecting a geometry
exports.filterHUC10 = function(geometry) {
  var USGS_HUC10 = ee.FeatureCollection('USGS/WBD/2017/HUC10');   // Watersheds
  var HUC10 = USGS_HUC10.filterBounds(geometry);
  return HUC10;
};


// Find HUC08 by HUC ID
exports.findHUC08 = function(HUC08_Id) {
  var USGS_HUC08 = ee.FeatureCollection('USGS/WBD/2017/HUC08');   // Subbasins
  var HUC08 = USGS_HUC08.filter(ee.Filter.eq('huc8', HUC08_Id));
  return HUC08;
};


// Find HUC10 by HUC ID
exports.findHUC10 = function(HUC10_Id) {
  var USGS_HUC10 = ee.FeatureCollection('USGS/WBD/2017/HUC10');   // Watersheds
  var HUC10 = USGS_HUC10.filter(ee.Filter.eq('huc10', HUC10_Id));
  return HUC10;
};

// find NWI by HUC08
var findNWI = function(HUC08_Id) {
    var nwi_asset_prefix = 'users/wqs/NWI-HU8/HU8_';
    var nwi_asset_suffix = '_Wetlands';
    var nwi_asset_path = nwi_asset_prefix + HUC08_Id + nwi_asset_suffix;
    var nwi_huc = ee.FeatureCollection(nwi_asset_path)
      .filter(ee.Filter.notEquals({leftField: 'WETLAND_TY', rightValue: 'Riverine'}));
    return nwi_huc;
};
exports.findNWI = findNWI;


// Extract NWI by providing a geometry
exports.extractNWI = function(geometry) {

  var HUC08 = filterHUC08(geometry);
  var HUC_list = ee.List(HUC08.aggregate_array('huc8')).getInfo();
  // print('Intersecting HUC08 IDs:', HUC_list);
  var nwi = ee.FeatureCollection(HUC_list.map(findNWI)).flatten();
  return nwi.filterBounds(geometry);
};


// Generate training data for KMeans Clutering
// exports.getTraining = function()


// KMeans clustering
exports.KMeansCluster = function(nCluster, nSamples) {
  return function(image) {
    
    // var centroid = ee.Geometry(image.get('system:footprint')).centroid();
    var centroid = ee.Geometry.Point(-99.1159, 47.0149);
    var roi = centroid.buffer(3000);
    var resolution = image.projection().nominalScale();
    
    var training = image.sample({
      region: roi,
      scale: resolution,
      numPixels: 5000
    });
    // Instantiate the clusterer and train it.
    var clusterer = ee.Clusterer.wekaKMeans(nCluster).train(training);
    // Cluster the input using the trained clusterer.
    var classifiedImage = image.cluster(clusterer).select('cluster');
    return classifiedImage;
  };
  
};


// Format a table of triplets into a 2D table of rowId x colId.
exports.formatTable = function(table, rowId, colId) {
  // Get a FeatureCollection with unique row IDs.
  var rows = table.distinct(rowId);
  // Join the table to the unique IDs to get a collection in which
  // each feature stores a list of all features having a common row ID. 
  var joined = ee.Join.saveAll('matches').apply({
    primary: rows, 
    secondary: table, 
    condition: ee.Filter.equals({
      leftField: rowId, 
      rightField: rowId
    })
  });

  return joined.map(function(row) {
      // Get the list of all features with a unique row ID.
      var values = ee.List(row.get('matches'))
        // Map a function over the list of rows to return a list of
        // column ID and value.
        .map(function(feature) {
          feature = ee.Feature(feature);
          return [feature.get(colId), feature.get('sum')];
        });
      // Return the row with its ID property and properties for
      // all matching columns IDs storing the output of the reducer.
      // The Dictionary constructor is using a list of key, value pairs.
      return row.select([rowId]).set(ee.Dictionary(values.flatten()));
    });
};


// export table to Google Drive
exports.exportTable = function(table, description, fileFormat, fields) {
  var randomChr = Math.random().toString(36).substr(2, 5); // generate 5 random characters as output file name
  description = description + '_' + randomChr;
  Export.table.toDrive({
    collection: table, 
    description: description, 
    // fileNamePrefix: desc2,
    fileFormat: fileFormat,
    selectors: fields
  });
};


// export raster image to Google Drive
exports.exportRasterToDrive = function(image, description, scale, geometry) {
  // Export the image, specifying scale and region.
  Export.image.toDrive({
    image: image,
    description: description,
    folder: 'GEE',
    scale: scale,
    maxPixels: 9e10,
    region: geometry,
    fileFormat: 'GeoTIFF',
    formatOptions: {
      cloudOptimized: true
    }
  });
  
};

exports.exportVectorToDrive = function(fc, format, description) {
  // Export the FeatureCollection to a KML file.
  Export.table.toDrive({
    collection: fc,
    description: description,
    fileFormat: format,// CSV, SHP, GeoJSON, KML, or KMZ.
  });
};

// Generate a histogram chart from an image
exports.imageHistogram = function(image, scale, minBucketWidth, title) {
  var histogram = ui.Chart.image.histogram({
    image: image,
    // region: image.geometry(),
    scale: scale,
    minBucketWidth: minBucketWidth
  });
  histogram.setOptions({
    title: title
  });
  return histogram;
  // print(histogram);
};


// Generate a histogram chart from an image
exports.imageHistogramByROI = function(image, roi, scale, minBucketWidth, title) {
  var histogram = ui.Chart.image.histogram({
    image: image,
    region: roi,
    scale: scale,
    minBucketWidth: minBucketWidth
  });
  histogram.setOptions({
    title: title
  });
  // print(histogram);
  return histogram;
};


// Convert raster to vector
exports.rasterToVector = function(image) {
  var fc = image.reduceToVectors({scale: 1, bestEffort: true, maxPixels: 2e10});
  fc = fc.map(function (feat) {
    return feat.set('area', feat.area(1));
  });
  return fc;
};


// column statistics by group
exports.groupSum = function(collection, column, group, groupName) {
  var selectors = [column, group];
  var sums = collection.reduceColumns({
    selectors: selectors,
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: groupName
    })
  });
  sums = ee.Dictionary(sums).get('groups');
  // print(sums);
  return sums;
};

exports.plotSumNWI = function(sums) {
  
  var getX = function(x) {
    return ee.Dictionary(x).get('Wetland Type');
  };
  var getY = function(y) {
    return ee.Number.parse(ee.Dictionary(y).get('sum')).divide(1e4);
  };
  // print(sums);
  var X = ee.List(sums).map(getX);
  var Y = ee.List(sums).map(getY);
  Y = ee.Array(Y);

  var chart = ui.Chart.array.values(Y, 0, X)
    .setChartType('ColumnChart')
    .setSeriesNames(['Area'])
    .setOptions({
      title: 'National Wetlands Inventory (NWI)',
      hAxis: {'title': 'Wetland Type'},
      vAxis: {'title': 'Area (ha)'},
  });
  return chart;
};


// Summary statistics of a column
exports.summaryStatsNWI = function(collection, column) {
  var count = ee.Number.parse(collection.aggregate_count(column));
  var sum = ee.Number.parse(collection.aggregate_sum(column)).divide(1e4);//.format('%,.2f');
  var mean = ee.Number.parse(collection.aggregate_mean(column)).divide(1e4);//.format('%,.2f');
  // print('Summary statistics of NWI wetlands:');
  // print('Wetland count: ', count);
  // print('Total wetland area (km2): ', sum);
  // print('Average wetland size (m2):', mean);
  return ee.List([count, sum, mean]);

};


// get highest elevation
exports.maxValue = function(img){
  var max = img.reduceRegion({
    reducer: ee.Reducer.max(),
    geometry: null,
    scale: 3,
    maxPixels: 1e9
  });
  return max;
};

// get lowest elevation
exports.minValue = function(img){
  var max = img.reduceRegion({
    reducer: ee.Reducer.min(),
    geometry: null,
    scale: 3,
    maxPixels: 1e9
  });
  return max;
};


exports.edgeDetector = function(img) {
    // Perform Canny edge detection and display the result.
  var canny = ee.Algorithms.CannyEdgeDetector({
    image: img, threshold: 1, sigma: 0
  });
  
  canny = canny.gt(0);
  canny = canny.updateMask(canny);
  return canny;
};


exports.imageExtent = function(img) {
  var bin = img.gt(0);
  bin = bin.updateMask(bin);
  var scale = img.projection().nominalScale();
  var vec = bin.reduceToVectors({scale: scale, bestEffort: true});
  return vec;
};


exports.histogram = function(image, band, polygon, scale) {
  var hist = image.select(band).reduceRegion({
  reducer: ee.Reducer.histogram()
      .combine('mean', null, true)
      .combine('variance', null, true), 
  geometry: polygon, 
  scale: scale,
  bestEffort: true
  });
  var band_name = band + '_histogram';
  return hist.get(band_name);
};

// Return the DN that maximizes interclass variance in B5 (in the region).
exports.otsu = function(histogram) {
  var counts = ee.Array(ee.Dictionary(histogram).get('histogram'));
  var means = ee.Array(ee.Dictionary(histogram).get('bucketMeans'));
  var size = means.length().get([0]);
  var total = counts.reduce(ee.Reducer.sum(), [0]).get([0]);
  var sum = means.multiply(counts).reduce(ee.Reducer.sum(), [0]).get([0]);
  var mean = sum.divide(total);
  
  var indices = ee.List.sequence(1, size);
  
  // Compute between sum of squares, where each mean partitions the data.
  var bss = indices.map(function(i) {
    var aCounts = counts.slice(0, 0, i);
    var aCount = aCounts.reduce(ee.Reducer.sum(), [0]).get([0]);
    var aMeans = means.slice(0, 0, i);
    var aMean = aMeans.multiply(aCounts)
        .reduce(ee.Reducer.sum(), [0]).get([0])
        .divide(aCount);
    var bCount = total.subtract(aCount);
    var bMean = sum.subtract(aCount.multiply(aMean)).divide(bCount);
    return aCount.multiply(aMean.subtract(mean).pow(2)).add(
          bCount.multiply(bMean.subtract(mean).pow(2)));
  });
  
  // print(ui.Chart.array.values(ee.Array(bss), 0, means));
  
  // Return the mean value corresponding to the maximum BSS.
  return means.sort(bss).get([-1]);
};


// // Generate training samples
// exports.trainingSamples = function(image) {
  
//   var training = input.sample({
//     numPixels: 5000
//   });
//   return training;
// };


// mapping function with multiple variables
var list = [1, 2, 3, 4]; //ee.List.sequence(1, 6);

var addNum = function(num) {
  return function(x) {
    return x + num;
  };
};
var result = list.map(addNum(10));
// print(result);
