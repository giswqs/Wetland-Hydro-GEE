//######################################################################################################## 
//#                                                                                                    #\\
//#                                      Wetland Hydrology Library                                     #\\
//#                                                                                                    #\\
//########################################################################################################


// date: 2018-08-04
// author: Qiusheng Wu | wqs@binghamton.edu
// website: https://wetlands.io | https://GIShub.org


// US States, including 56 entities
exports.US_States = ee.FeatureCollection('ft:1fRY18cjsHzDgGiJiS2nnpUU3v9JPDc2HNaR7Xk8');


// USGS Watershed Boundary Dataset
exports.USGS_HUC02 = ee.FeatureCollection('USGS/WBD/2017/HUC02');   // Regions
exports.USGS_HUC04 = ee.FeatureCollection('USGS/WBD/2017/HUC04');   // Subregions
exports.USGS_HUC06 = ee.FeatureCollection('USGS/WBD/2017/HUC06');   // Basins
exports.USGS_HUC08 = ee.FeatureCollection('USGS/WBD/2017/HUC08');   // Subbasins
exports.USGS_HUC10 = ee.FeatureCollection('USGS/WBD/2017/HUC10');   // Watersheds
exports.USGS_HUC12 = ee.FeatureCollection('USGS/WBD/2017/HUC12');   // Subwatersheds


// North Dakota datasets
exports.ND_LiDAR = ee.ImageCollection('users/wqs/ND-LiDAR/LiDAR');
exports.ND_Sink = ee.ImageCollection('users/wqs/ND-LiDAR/Sink');
exports.ND_HUC08 = ee.FeatureCollection('users/wqs/ND-LiDAR/HUC/James_Pipestem_Apple_HU8');
exports.ND_HUC10 = ee.FeatureCollection('users/wqs/ND-LiDAR/HUC/James_Pipestem_Apple_HU10');
exports.ND_HUC12 = ee.FeatureCollection('users/wqs/ND-LiDAR/HUC/James_Pipestem_Apple_HU12');



// PPR datasets
exports.PPR_USA = ee.FeatureCollection("users/wqs/PPR/PPR_USA");
exports.PPR_USA2 = ee.FeatureCollection("users/wqs/PPR/PPR_USA2");
exports.PPR_North_America = ee.FeatureCollection("users/wqs/PPR/PPR_North_America");


// data for Pipestem watershed
// exports.Pipestem_HUC08 = USGS_HUC08.filter(ee.Filter.eq('name', 'Pipestem'));
// exports.Pipestem_HUC10 = USGS_HUC10.filter(ee.Filter.stringContains({leftField: 'huc10', rightValue: '10160002'}));
exports.Pipestem_HUC08 = ee.FeatureCollection("users/wqs/Pipestem/Pipestem_HUC8");
exports.Pipestem_HUC10 = ee.FeatureCollection("users/wqs/Pipestem/Pipestem_HUC10");
exports.Pipestem_Dep = ee.FeatureCollection("users/wqs/Pipestem/depressions");
exports.Pipestem_Dep_Level = ee.Image("users/wqs/Pipestem/lidar_dep_level");
exports.Pipestem_Lidar = ee.Image("users/wqs/Pipestem/lidar_3m");
exports.Pipestem_NWI = ee.FeatureCollection('users/wqs/Pipestem/NWI');
exports.Pipestem_Sink = ee.Image("users/wqs/Pipestem/sink_3m");
exports.Pipestem_Lake_Samples = ee.FeatureCollection("users/wqs/Pipestem/lake_samples");


// data for Cottonwood Lake Study Area
exports.CLSA_Lidar = ee.Image("users/wqs/CLSA/lidar_1m");
exports.CLSA_Sink = ee.Image("users/wqs/CLSA/sink_1m");
exports.CLSA_Dep_Level = ee.Image("users/wqs/CLSA/lidar_dep_level");


// National Land Cover Database
exports.NLCD2011 = ee.Image('USGS/NLCD/NLCD2011').select('landcover'); //.clip(Pipestem_HUC10.geometry());
exports.GlobeLand30 = ee.ImageCollection('users/cgmorton/GlobeLand30');
// The CORINE (coordination of information on the environment) Land Cover (CLC); resolution: 100 m
exports.CLC = ee.ImageCollection('COPERNICUS/CORINE/V18_5_1/100m');
// ESA GlobCover: Global Land Cover Map; Resolution: 100 m
exports.ESA_GLOBCOVER = ee.ImageCollection('ESA/GLOBCOVER_L4_200901_200912_V2_3');  


// National Elevation Dataset
exports.NED = ee.Image('USGS/NED');

// HydroSHEDS DEM developed by the World Wildlife Fund (WWF)   3 arc second = ~ 90 m.
exports.WWF_VFDEM = ee.Image('WWF/HydroSHEDS/03VFDEM');     // void filled DEM
exports.WWF_CONDEM = ee.Image('WWF/HydroSHEDS/03CONDEM');   // hydrologically conditioned DEM
exports.WWF_DIR = ee.Image('WWF/HydroSHEDS/03DIR');         // flow direction
exports.WWF_ACC = ee.Image('WWF/HydroSHEDS/15ACC');         // flow accumulation

// ALOS DSM: Global 30m
exports.ALOS_DEM = ee.Image('JAXA/ALOS/AW3D30_V1_1');


// Multi-Scale Topographic Position Index; Resolution: 270 m
exports.NED_TPI = ee.Image('CSP/ERGo/1_0/US/mTPI');
exports.SRTM_TPI = ee.Image('CSP/ERGo/1_0/Global/SRTM_mTPI');
exports.ALOS_TPI = ee.Image('CSP/ERGo/1_0/Global/ALOS_mTPI');


// Landforms
exports.NED_Landforms = ee.Image('CSP/ERGo/1_0/US/landforms');


// Landsat 7 Annual Composite 1999-2014  https://goo.gl/cVvPQs 
exports.LE7_TOA_1YEAR = ee.ImageCollection('LE7_TOA_1YEAR');
exports.LE7_TOA_3YEAR = ee.ImageCollection('LE7_TOA_3YEAR');
exports.LE7_TOA_5YEAR = ee.ImageCollection('LE7_TOA_5YEAR');
exports.LE7_TOA_1YEAR_1999 = ee.Image('LE7_TOA_1YEAR/1999');
exports.LE7_TOA_3YEAR_2000_2002 = ee.Image('LE7_TOA_3YEAR/2000_2002');
exports.LE7_TOA_5YEAR_1999_2003 = ee.Image('LE7_TOA_5YEAR/1999_2003');


// Surface water data
// GLCF: Landsat Global Inland Water Jan 1, 2000 - Dec 31, 2000
exports.GLCF_Water = ee.ImageCollection('GLCF/GLS_WATER');
exports.JRC_Water = ee.Image("JRC/GSW1_0/GlobalSurfaceWater");
exports.JRC_Water_Metadata = ee.Image('JRC/GSW1_0/Metadata');
exports.JRC_Water_Monthly = ee.ImageCollection('JRC/GSW1_0/MonthlyHistory');
exports.JRC_Water_Yearly = ee.ImageCollection('JRC/GSW1_0/YearlyHistory');
exports.JRC_Water_Monthly_Recurrence = ee.ImageCollection('JRC/GSW1_0/MonthlyRecurrence');
exports.US_Lithology = ee.Image('CSP/ERGo/1_0/US/lithology');

// Soil moisture data
exports.SMAP = ee.ImageCollection("NASA_USDA/HSL/SMAP_soil_moisture");
