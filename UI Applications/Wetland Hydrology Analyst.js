//// ********************************************************************//// 
// This script was developed to map wetland hydrological dynamics in the   //
// Prairie Pothole Region using time-series NAIP imagery and LiDAR data.   //
// The methods used include: k-means clustering, Otsu thresholding,        //
// LiDAR depression analysis, object-based image analysis, etc.            //
// Please use Google Chrome. Other browsers might not work properly.       //
// Author: Qiusheng Wu (https://wetlands.io | http://GIShub.org)           //
//// ********************************************************************//// 

// Load modules
var utils = require('users/giswqs/public:Modules/utils');
var datasets = require('users/giswqs/public:Modules/datasets');
var mapping = require('users/giswqs/public:Modules/mapping');
// Visit the following URL to see the source code for the above modules: 
// https://code.earthengine.google.com/?accept_repo=users/giswqs/modules

// Load National Hydrography Dataset (NHD) 
var HUC10 = ee.FeatureCollection('USGS/WBD/2017/HUC10');  // There are 18,487 HUC10 watersheds for the entire U.S.
// For this case study, we focused on 26 HUC10 watersheds, which are contained in three HUC8 subbasins, including:
// Pipestem (10160002), James Headwaters (10160001), Apple Creek (10130103). Total watershed area: 16,576 km2
var Case_Area = ee.FeatureCollection("users/wqs/PPR/RSE_Case_Study_Area");

// Customize parameters
var scale = 2;          // image scale (resolution) for computing statistics
var min_dep_size = 100; // minimum depression/wetland size in pixels
var nclusters = 5;      // number of clusters for the k-means clustering
var years = [2009, 2010, 2012, 2014, 2015, 2017]; // available NAIP imagery for the study area
var num_years = years.length;                     // number of years with available NAIP imagery
var permanent_threshold = 80;     // threshold (%) for extracting permanent water from JRC Global Water Occurrence 
var cluster_threshold = 0.10;      // A cluster within permanent water must exceed x% of pixels in order to be classified as water

// Add HUC layers to the map
// Map.setCenter(-99.00, 47.01, 8);
Map.centerObject(Case_Area, 12);
Map.addLayer(ee.Image().paint(datasets.ND_HUC08, 0, 2), {}, 'HUC08 Subbasin');   // HUC08 for the study area
Map.addLayer(ee.Image().paint(datasets.ND_HUC10, 0, 1), {}, 'HUC10 Watershed');  // HUC10 for the study area
// Map.addLayer(ee.Image().paint(HUC10, 0, 1), {}, 'HUC10 Watershed');           // HUC10 for the entire U.S.
Map.addLayer(ee.Image().paint(Case_Area, 0, 2), {palette: ['green']}, 'Case Area');


// ---------------------------------------------------------------------------------------------------- //
// Interactive UI
// ---------------------------------------------------------------------------------------------------- //

// Add a panel to the left of the map for displaying results 
var panel = ui.Panel();
panel.style().set('width', '400px');

var intro = ui.Panel([
  ui.Label({
    value: 'Wetland Hydrology Analyst',
    style: {fontSize: '20px', fontWeight: 'bold'}
  }),
  ui.Label({
    value: 'Mapping wetland hydrological dynamics in the Prairie Pothole Region using LiDAR data and aerial imagery.',
    style: {fontSize: '14px', fontWeight: 'bold'}
  }),
  ui.Label('Select the year of NAIP aerial imagery (1-m RGBN) to display on the map. '),
]);
panel.add(intro);

var buttons_panel = ui.Panel([], ui.Panel.Layout.flow('horizontal'));
var years_panel = ui.Panel([], ui.Panel.Layout.flow('horizontal'));
var nlayers = Map.layers().length();

var year_select = ui.Select({
    items: ['2009', '2010', '2012', '2014', '2015', '2017'],
    value: '2015',
    onChange: function(key){
      Map.unlisten();                     // deletes map callback function
      Map.style().set('cursor', 'hand');  // reset the map's default cursor
      inspect_button.setDisabled(false);  // enable the activate button
      deactiv_button.setDisabled(true);   // disable this button
    }
  });
  
years_panel.add(year_select);
panel.add(years_panel);
panel.add(ui.Label('Activate the inspector to click a watershed on the map to inspect its properties and map wetland inundation extent.'));

var inspect_button  = ui.Button({label: 'Activate inspector', onClick: function() {
  // register a callback on the map to be invoked when the map is clicked
  var selected_year = parseInt(year_select.getValue(), 10);
  var ith_year = years.indexOf(selected_year);

  Map.onClick(function(coords) {
    // get clicked subbasin info
    var clicked_point      = ee.Geometry.Point(coords.lon, coords.lat);
    var clicked_basin_fc   = HUC10.filterBounds(clicked_point);
    var clicked_basin      = ee.Feature(clicked_basin_fc.first());
    var clicked_basin_geom = clicked_basin.geometry();
    var clicked_basin_id   = clicked_basin.get('huc10');
    var clicked_basin_name = clicked_basin.get('name');
    var clicked_basin_size = clicked_basin_geom.area().divide(1e4).format('%,.2f');
    var huc10_id = clicked_basin_id.getInfo();
    var huc8_id = huc10_id.substring(0, 8);
    var nwi_asset_path = 'users/wqs/NWI-HU8/HU8_' + huc8_id + '_Wetlands';    // NWI wetlands for the clicked watershed
    var clicked_nwi_huc = ee.FeatureCollection(nwi_asset_path).filterBounds(clicked_basin_geom)
      .filter(ee.Filter.notEquals({leftField: 'WETLAND_TY', rightValue: 'Riverine'}));  // exclude riverine wetlands

    var HUC = utils.findHUC10(huc10_id);    // extract NHD HUC10 for the clicked location
    var geom = HUC.geometry();
    var centroid = geom.centroid();
    var roi = centroid.buffer(5000);
    
    var ilyr = 2; 
    Map.layers().set(ilyr++, ui.Map.Layer(ee.Image().paint(geom, 0, 3), {palette: 'red'}, 'HUC-' + huc10_id)); 
    
    var NED = ee.Image('USGS/NED').clip(geom);  // USGS NED elevation data
    var LiDAR = ee.ImageCollection('users/wqs/ND-LiDAR/LiDAR').filterBounds(geom).mosaic().clip(geom);  // LiDAR data for the clicked watershed
    var Sink = ee.ImageCollection('users/wqs/ND-LiDAR/Sink').filterBounds(geom).mosaic().clip(geom);    // LiDAR-derived depressions for the clicked watershed
    var CLSA_LiDAR = ee.Image('users/wqs/CLSA/lidar_1m');   // LiDAR data for the Cottonwood Lake Study Area (CLSA)

    // Get available surface water products in GEE Geospatial Data Catalog
    var GLCF_Water = ee.ImageCollection('GLCF/GLS_WATER').mosaic().clip(geom).eq(2);  // GLCF: Landsat Global Inland Water (2000)
    GLCF_Water = GLCF_Water.updateMask(GLCF_Water);
    var GLCF_Water_Area = ee.Number.parse(utils.imgAreaHa(GLCF_Water, geom, 30).get('water')).format('%,.2f');
    var JRC_Water = ee.Image("JRC/GSW1_0/GlobalSurfaceWater").clip(geom);   // JRC Global Surface Water Mapping Layers (1984-2015)
    var JRC_Water_Max_Extent = JRC_Water.select('max_extent');    // The frequency with which water was present.
    var JRC_Water_Max_Area = ee.Number.parse(utils.imgAreaHa(JRC_Water_Max_Extent, geom, 30).get('max_extent')).format('%,.2f');
    var JRC_Water_Occurrence = JRC_Water.select('occurrence');  // Binary image containing 1 anywhere water has ever been detected.
    var JRC_Permanent_Water = JRC_Water_Occurrence.gt(permanent_threshold);

    // Get time-series NAIP imagery with NDWI and NDVI bands added
    var NAIP = utils.findNAIP(geom);
    var time_start = ee.List(NAIP.aggregate_array('system:time_start')); // image acquisition date (starting time)
    var time_end = ee.List(NAIP.aggregate_array('system:time_end'));     // image acquisition date (ending time)
    var ithNAIP = ee.Image(NAIP.toList(num_years).get(ith_year));        // selected NAIP imagery to display on the map
    // print(time_start);
    // print(time_end);

    // Get NWI wetlands for the clicked watershed
    var NWI = utils.findNWI(huc8_id).filterBounds(geom);
    var NWI_stats = NWI.aggregate_stats('Shape_Area');  
    var NWI_summary = utils.summaryStatsNWI(NWI, 'Shape_Area');   // Summary statistics of NWI wetlands for the clicked watershed
    var NWI_count = NWI_summary.get(0);   // wetland count
    var NWI_total = ee.Number(NWI_summary.get(1)).format('%,.2f');  // total wetland area
    var NWI_mean = ee.Number(NWI_summary.get(2)).format('%,.2f');   // mean wetland size
    var NWI_sums = utils.groupSum(NWI, 'Shape_Area', 'WETLAND_TY', 'Wetland Type');  // Aggregated wetland area for each wetland type
    var NWI_chart = utils.plotSumNWI(NWI_sums);   // plot wetland chart for each wetland type
    // var training_samples = ee.FeatureCollection(NWI.sort('Shape_Area', false).toList(50).slice(5, 45));   // select large NWI wetlands as training samples for k-means clustering
    
    // Get NDWI image
    var NDWI = NAIP.select(['ndwi']);
    var NDWI_mean = ee.ImageCollection(NDWI).mean();  // Create an average NDWI image based on all available NAIP imagery
    var hist_NDWI = ee.Dictionary(utils.histogram(NDWI_mean, 'ndwi', geom, scale));  // plot NDWI histogram
    var threshold_NDWI = ee.Number.parse(utils.otsu(hist_NDWI).format('%.4f'));      // compute optimal NDWI threshold using Otsu's method 


    // extract JRC Monthly History product
    var get_JRC_monthly = function(input) {
      var start_date = ee.Date(input.get('system:time_start'));
      var end_date = ee.Date(input.get('system:time_end'));
      var start_year = ee.Number(start_date.get('year'));
      start_year = ee.Algorithms.If(start_year.gt(2015), 2015, start_year);  //Between 16 March 1984 and 10 October 2015
      var start_month = ee.Number(start_date.get('month'));
      var end_month = ee.Number(end_date.get('month')).add(1);
      var start = ee.Date.fromYMD(start_year, start_month, 1);
      // var end = ee.Date.fromYMD(start_year, end_month, 1);
      var end = ee.Date.fromYMD(start_year, start_month.add(2), 1);
      var JRC_monthly_images = ee.ImageCollection("JRC/GSW1_0/MonthlyHistory").filterDate(start, end);
      // print(JRC_monthly_images);
      var JRC_monthly = JRC_monthly_images.max().eq(2).clip(geom);
      JRC_monthly = JRC_monthly.updateMask(JRC_monthly);
      return JRC_monthly.set({'system:time_start': start, 'system:time_end': end});
      
    };
    
    var JRC_monthly_waters = NAIP.map(get_JRC_monthly);
    var ithJRCwater = ee.Image(JRC_monthly_waters.toList(num_years).get(ith_year)); 

    // function for classifying image using k-means clustering
    var classifyImage = function(input){
      var training = input.sample({
        region: roi, // using the sample image to extract training samples
        scale: scale,
        numPixels: 5000
      });
      // Instantiate the clusterer and train it.
      var clusterer = ee.Clusterer.wekaKMeans(nclusters).train(training);
      // Cluster the input using the trained clusterer.
      var classifiedImage = input.cluster(clusterer).select('cluster');
      return classifiedImage;
    };
    
    // classifying the image collection using the map function
    var clusteredImages = NAIP.map(classifyImage);
    var ithClusterImage = ee.Image(clusteredImages.toList(num_years).get(ith_year));  // selected year of image to display on the map
    
    var getWaterCluster = function(input) {
      var clusterImg = input.updateMask(JRC_Permanent_Water);
      var frequency = clusterImg.reduceRegion({
        reducer: ee.Reducer.frequencyHistogram(),
        scale:30,
        maxPixels: 2.1E9
      });
      var dict = ee.Dictionary(frequency.get('cluster'));
      var keys = ee.List(dict.keys());
      var values = ee.List(dict.values());
      var threshold = ee.Number(values.reduce(ee.Reducer.sum())).multiply(cluster_threshold); // make sure each cluster > 10% * sum 
      var clusterList = values.map(function (value) {
        value = ee.Number.parse(value);
        return value.gt(threshold);
      });
      var indexes = ee.List.sequence(0, keys.size().subtract(1));
      var clsLabels = indexes.map(function(index) {
        var key = ee.Number.parse(keys.get(index)).add(1);
        var value = clusterList.get(index);
        return key.multiply(value);
      });
      clsLabels = clsLabels.removeAll(ee.List([0]));
      clsLabels = clsLabels.map(function(x) {
        return ee.Number(x).subtract(1);
      });
      var outList = ee.List.repeat(-1, clsLabels.size());
      clusterImg = input.remap(clsLabels, outList).eq(-1);
      clusterImg = clusterImg.updateMask(clusterImg);
      return clusterImg;
      
    };
    // var ithClusterImg = getWaterCluster(ithClusterImage);
    var waterImages = clusteredImages.map(getWaterCluster);
    var ithWaterImage = ee.Image(waterImages.toList(num_years).get(ith_year));
    JRC_Permanent_Water = JRC_Permanent_Water.updateMask(JRC_Permanent_Water);
  
    // extract water pixels locoated within LiDAR depressions
    var getWaterWithinDep = function(input){
      var output = input.eq(1).and(Sink.gt(0));
      output = output.updateMask(output);
      return output;
    };
    // clustered water pixels located within lidar depressions
    var refinedWaterImages = waterImages.map(getWaterWithinDep);
    var ithRefinedWater = ee.Image(refinedWaterImages.toList(num_years).get(ith_year));
    
    // region group to remove small objects
    var regionGroup = function(input){
      var patch_size = input.connectedPixelCount(min_dep_size, true);  //stop counting pixels when the object is larger than the specified minimum depression size
      var large_patches = patch_size.gte(min_dep_size);
      large_patches = large_patches.updateMask(large_patches);
      return large_patches;
    };
    
    // var regionImages = refinedWaterImages.map(regionGroup);
    var regionImages = refinedWaterImages;
    
    // add image date to resultant image based on the original NAIP image
    var addDate = function(input) {
      var sys_index = ee.Number.parse(input.get('system:index'));
      var start_index = time_start.get(sys_index);
      var end_index = time_end.get(sys_index);
      return input.set({'system:time_start': start_index, 'system:time_end': end_index});
    };
    
    regionImages = regionImages.map(addDate);
    var ithRegionImage = ee.Image(regionImages.toList(num_years).get(ith_year));    // selected year of image to display on the map

    var Occurrence = ee.Image(regionImages.sum());  // Binary image containing 1 anywhere water has ever been detected.

    var waterVectors = regionImages.map(utils.rasterToVector).toList(num_years);
    var ithWaterVector = ee.FeatureCollection(waterVectors.get(ith_year));
    // utils.exportVectorToDrive(ithWaterVector, 'SHP', 'HUC_' + huc10_id + '_Wetlands_' + years[ith_year].toString());

    for(var i = 0; i < num_years; i++) {
      ithRegionImage = ee.Image(regionImages.toList(num_years).get(i));
      utils.exportRasterToDrive(ithRegionImage, 'HUC_' + huc10_id + '_Inundation_' + years[i].toString(), 1, geom);
    }
    utils.exportRasterToDrive(Occurrence.toInt(), 'HUC_' + huc10_id + '_Occurrence', 1, geom);
    ithRegionImage = ee.Image(regionImages.toList(num_years).get(ith_year));    // selected year of image to display on the map


    // // export results for the case area
    // var case_geom = Case_Area.geometry();
    // utils.exportRasterToDrive(ithRegionImage, 'Case_NAIP_Inundation_Image_' + years[ith_year].toString(), 1, case_geom);
    // utils.exportRasterToDrive(ithClusterImage, 'Case_NAIP_Cluster_Image_' + years[ith_year].toString(), 1, case_geom);
    // utils.exportRasterToDrive(Occurrence.toInt(), 'Case_NAIP_Occurrence_Image_' + years[ith_year].toString(), 1, case_geom);
    // utils.exportRasterToDrive(ithJRCwater, 'Case_JRC_Monthly_Water_Image_' + years[ith_year].toString(), 30, case_geom);
    // utils.exportRasterToDrive(JRC_Water_Occurrence, 'Case_JRC_Water_Occurrence_Image', 30, case_geom);


    // calculate pixel area in hectare
    var getArea = function(input) {
      var pixelArea = input.multiply(ee.Image.pixelArea()).divide(10000);  
      var watershedArea = pixelArea.reduceRegions({
        collection: HUC,
        reducer: ee.Reducer.sum(),
        scale: 10
      });
      watershedArea = watershedArea.map(function(fc) {
        var year = ee.Date(input.get('system:time_start')).get('year');
        var fieldValue = ee.String('Y').cat(ee.String(year));
        return fc.set('year', fieldValue);
      });
      // watershedArea = watershedArea.map(function(fc) {return fc.set({Y2010ha: fc.get('sum')})});
      watershedArea = watershedArea.select(['huc10', 'name', 'year', 'sum']);
      return watershedArea;
    };
    
    var NAIP_water_areas = regionImages.map(getArea);
    NAIP_water_areas = NAIP_water_areas.flatten();
    
    var JRC_water_areas = JRC_monthly_waters.map(getArea);
    JRC_water_areas = JRC_water_areas.flatten();


    var NAIP_water_table = ee.FeatureCollection(utils.formatTable(NAIP_water_areas, 'name', 'year'));
    var JRC_water_table = ee.FeatureCollection(utils.formatTable(JRC_water_areas, 'name', 'year'));


    // Make a chart by feature. (rowid: name; colid: year)
    var chartH = function(table, title) {return ui.Chart.feature.byFeature(table, 'name')
        .setChartType('ColumnChart')
        .setOptions({
          title: title, //'Total Wetland Inundation Area',
          hAxis: {title: 'Watershed'},
          vAxis: {title: 'Inundation Area (ha)'}
        });
    };
    
    // Make a chart by feature. (rowid: year; colid: sum)
    var chartV = function(table, title) {return ui.Chart.feature.byFeature(table, 'year', 'sum')
        .setChartType('ColumnChart')
        .setOptions({
          title: title, //'Total Wetland Inundation Area',
          hAxis: {title: 'Year'},
          vAxis: {title: 'Inundation Area (ha)'}
    })};

    // add label widgets.
    var uid = 4;  // starting widget index. 4 widgets already exist. 
    var label_subbasin_id = ui.Label();   // display watershed id
    panel.widgets().set(uid++, label_subbasin_id); 
    
    var label_subbasin_name = ui.Label();   // display watershed name  
    panel.widgets().set(uid++, label_subbasin_name); 
    
    var label_subbasin_size = ui.Label();   // display watershed size
    panel.widgets().set(uid++, label_subbasin_size); 
    
    var label_glcf_water = ui.Label();      // display GLCF water area for the watershed
    panel.widgets().set(uid++, label_glcf_water); 
    
    var label_jrc_water = ui.Label();       // display JRC water max extent for the watershed
    panel.widgets().set(uid++, label_jrc_water); 
    
    var label_nwi_count = ui.Label();       // display NWI wetland count 
    panel.widgets().set(uid++, label_nwi_count); 
    
    var label_nwi_total = ui.Label();       // display total NWI wetland area
    panel.widgets().set(uid++, label_nwi_total); 
    
    var label_nwi_mean = ui.Label();        // display average NWI wetland size
    panel.widgets().set(uid++, label_nwi_mean); 
    
    // Add widgets to panel (using 'evaluate' for asynchronous calls):
    label_subbasin_id.setValue('Watershed id: computing ...');
    clicked_basin_id.evaluate(function(result) {
      label_subbasin_id.setValue('Watershed id: ' +  result);
    });
    
    label_subbasin_name.setValue('Watershed name: computing ...');
    clicked_basin_name.evaluate(function(result) {
      label_subbasin_name.setValue('Watershed name: ' +  result);
    });
    
    label_subbasin_size.setValue('Watershed area: computing ...');
    clicked_basin_size.evaluate(function(result) {
      label_subbasin_size.setValue('Watershed area: ' +  result + ' ha (1 ha = 10,000 m2)');
    });
    
    label_glcf_water.setValue('GLCF Landsat water area (2000): computing ...');
    GLCF_Water_Area.evaluate(function(result) {
      label_glcf_water.setValue('GLCF Landsat water area (2000): ' +  result + ' (ha)');
    });
    
    label_jrc_water.setValue('JRC max water extent (1984-2015): computing ...');
    JRC_Water_Max_Area.evaluate(function(result) {
      label_jrc_water.setValue('JRC max water extent (1984-2015): ' +  result + ' (ha)');
    });
    
    label_nwi_count.setValue('NWI wetlands count: computing ...');
    NWI_count.evaluate(function(result) {
      label_nwi_count.setValue('NWI wetlands count: ' +  result);
    });
    
    label_nwi_total.setValue('NWI wetlands total area: computing ...');
    NWI_total.evaluate(function(result) {
      label_nwi_total.setValue('NWI wetlands total area: ' +  result + ' (ha)');
    });
    
    label_nwi_mean.setValue('NWI wetlands average size: computing ...');
    NWI_mean.evaluate(function(result) {
      label_nwi_mean.setValue('NWI wetlands average size: ' +  result + ' (ha)');
    });
    
    var uid_nwi = uid; uid++;
    panel.widgets().set(uid_nwi, ui.Label({
      value: 'Loading NWI chart ...',
      style: {color: 'gray'}
    }));  
    NWI_sums.evaluate(function(result) {
      panel.widgets().set(uid_nwi, utils.plotSumNWI(result));
    });  
    
    var label_NDWI_id = ui.Label();
    panel.widgets().set(uid++, label_NDWI_id); 
    label_NDWI_id.setValue('NDWI thresholding using Otsu method: computing ...');
    threshold_NDWI.evaluate(function(result) {
      label_NDWI_id.setValue('NDWI thresholding using Otsu method: ' +  result);
    });
    
    var uid_ndwi = uid; uid++;
    panel.widgets().set(uid_ndwi, ui.Label({
      value: 'Loading NDWI chart ...',
      style: {color: 'gray'}
    }));  
    hist_NDWI = ee.List([hist_NDWI.get('histogram'),hist_NDWI.get('bucketMeans')]);
    hist_NDWI.evaluate(function(result) {
      panel.widgets().set(uid_ndwi, ui.Chart.array.values(result[0], 0, result[1])
        .setChartType('ColumnChart')
        .setOptions({title: 'Histogram of Mean NDWI (2009-2017)' ,
                                    vAxis: {title: 'Frequency'},
                                    hAxis: {title: 'NDWI'},
                                    bar: {groupWidth: "100%"},
                                    legend: {position: 'none'}}));
    });  

    var uid_lidar = uid; uid++;
    panel.widgets().set(uid_lidar, ui.Label({
      value: 'Loading elevation histogram ...',
      style: {color: 'gray'}
    }));  
    LiDAR.evaluate(function(result) {
      panel.widgets().set(uid_lidar, utils.imageHistogram(LiDAR, 30, 2, 'Histogram of LiDAR Elevation'));
    }); 
    
    var uid_waterV_JRC = uid; uid++;
    panel.widgets().set(uid_waterV_JRC, ui.Label({
      value: 'Loading JRC Surface Water Chart ...',
      style: {color: 'gray'}
    }));  
    JRC_water_areas.evaluate(function(result) {
      panel.widgets().set(uid_waterV_JRC, chartV(JRC_water_areas, 'Total Surface Water Area (JRC)'));
    });  
    
    var uid_waterV = uid; uid++;
    panel.widgets().set(uid_waterV, ui.Label({
      value: 'Loading NAIP Wetland Inundation Chart ...',
      style: {color: 'gray'}
    }));  
    NAIP_water_areas.evaluate(function(result) {
      panel.widgets().set(uid_waterV, chartV(NAIP_water_areas, 'Total Wetland Inundation Area (NAIP)'));
    });  
    
    var uid_waterH = uid; uid++;
    panel.widgets().set(uid_waterH, ui.Label({
      value: 'Loading NAIP Wetland Inundation Chart 2 ...',
      style: {color: 'gray'}
    }));  
    NAIP_water_table.evaluate(function(result) {
      panel.widgets().set(uid_waterH, chartH(NAIP_water_table, 'Total Wetland Inundation Area (NAIP)'));
    });  
    
    var uid_waterH_JRC = uid; uid++;
    panel.widgets().set(uid_waterH_JRC, ui.Label({
      value: 'Loading JRC Surface Water Chart 2 ...',
      style: {color: 'gray'}
    }));  
    NAIP_water_table.evaluate(function(result) {
      panel.widgets().set(uid_waterH_JRC, chartH(JRC_water_table, 'Total Surface Water Area (JRC)'));
    });  
    
    
    // var empty = ee.Image().byte();
    // var palette = ['green', 'yellow', 'orange', 'red'];
    // var NWI_Symbo = empty.paint({
    //   featureCollection: NWI,
    //   color: 'WETLAND_TY',
    // });
    
    var nwi_color = mapping.nwi_add_color(NWI);
    
    // add layers to display on the map
    Map.layers().set(ilyr++, ui.Map.Layer(NDWI_mean, mapping.viz.ndwi, 'Mean NDWI (2009-2017)', false));  
    Map.layers().set(ilyr++, ui.Map.Layer(ithNAIP, mapping.viz.nir, 'NAIP Year ' + years[ith_year].toString(), true));    
    Map.layers().set(ilyr++, ui.Map.Layer(ithClusterImage.randomVisualizer(), {}, 'Cluster Year ' + years[ith_year].toString(), false));    
    Map.layers().set(ilyr++, ui.Map.Layer(ithWaterImage, {}, 'Label Year ' + years[ith_year].toString(), false));    
    Map.layers().set(ilyr++, ui.Map.Layer(ithRefinedWater, {palette: 'blue'}, 'Refined Year ' + years[ith_year].toString(), false));    
    Map.layers().set(ilyr++, ui.Map.Layer(ithRegionImage, {palette: 'blue'}, 'Water Year ' + years[ith_year].toString(), true));   
    Map.layers().set(ilyr++, ui.Map.Layer(ithWaterVector, {}, 'Vectors Year ' + years[ith_year].toString(), false));    
    Map.layers().set(ilyr++, ui.Map.Layer(ithJRCwater, {}, "JRC Monthly " + years[ith_year].toString(), false));    
    Map.layers().set(ilyr++, ui.Map.Layer(Occurrence.randomVisualizer(), {}, 'Water Occurrence', false));    
    Map.layers().set(ilyr++, ui.Map.Layer(LiDAR, {min: 400, max: 600}, 'LiDAR DEM', false));  
    // Map.layers().set(ilyr++, ui.Map.Layer(ee.Terrain.hillshade(CLSA_LiDAR), {}, 'CLSA Hillshade', false));  
    Map.layers().set(ilyr++, ui.Map.Layer(Sink.randomVisualizer(), {}, 'LiDAR Depressions', false));    
    Map.layers().set(ilyr++, ui.Map.Layer(JRC_Water_Occurrence, mapping.viz.ndwi, "JRC Water (1984-2015)", false));    
    Map.layers().set(ilyr++, ui.Map.Layer(JRC_Permanent_Water.randomVisualizer(), {}, "JRC Permanent Water", false)); 
    Map.layers().set(ilyr++, ui.Map.Layer(GLCF_Water.randomVisualizer(), {}, 'GLCF Water (2000)', false));    
    Map.layers().set(ilyr++, ui.Map.Layer(nwi_color, {gamma: 0.3}, 'NWI Wetlands Color', false));    
    Map.layers().set(ilyr++, ui.Map.Layer(NWI, {}, 'NWI Wetlands', false));   
    Map.layers().set(ilyr++, ui.Map.Layer(ee.Image().paint(Case_Area, 0, 2), {palette: ['green']}, 'Case Area', true));    

    // Map.layers().set(ilyr++, ui.Map.Layer(NWI_Symbo, {palette: palette}, 'NWI color', false));   
    // Map.layers().set(ilyr++, ui.Map.Layer(training_samples, {}, 'Training Samples', false));    

  });
  // convert map cursor to crosshair
  Map.style().set('cursor', 'crosshair');
  deactiv_button.setDisabled(false);       // enable the deactivate button
  inspect_button.setDisabled(true);        // disable this button
}});

var deactiv_button  = ui.Button({label: 'Deactivate inspector', onClick: function() {
  Map.unlisten();                     // deletes map callback function
  Map.style().set('cursor', 'hand');  // reset the map's default cursor
  inspect_button.setDisabled(false);  // enable the activate button
  deactiv_button.setDisabled(true);   // disable this button
}, disabled: true});

// add activate and deacivate buttons
buttons_panel.add(inspect_button);
buttons_panel.add(deactiv_button);
panel.add(buttons_panel);

ui.root.insert(0, panel);
