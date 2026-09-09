import React, { createContext, useContext, useState } from 'react';

export type Language = 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  speak: (text: string) => void;
}

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.chat': 'Chat',
    'nav.officer': 'Officer',
    'nav.logout': 'Logout',
    'nav.welcome': 'Welcome',
    
    // Home Page
    'home.title': 'Smart Farming Dashboard',
    'home.subtitle': 'AI-powered agricultural intelligence with real-time weather, soil analysis, and personalized farming recommendations',
    'home.weather': 'Current Weather',
    'home.soil': 'Soil Status',
    'home.crops': 'Crop Management',
    'home.ai_advisor': 'AI Advisor',
    'home.crop_prices': 'Crop Prices',
    'home.kerala_crop_prices': 'Crop Prices',
    'home.krishi_seva_kendra': 'Krishi Seva Kendra',
    'home.nearest_krishi_seva_kendra': 'Nearest Krishi Seva Kendras',
    'home.recommendations': 'AI Recommendations',
    'home.refresh': 'Refresh Data',
    'home.location': 'Location',
    'home.temperature': 'Temperature',
    'home.humidity': 'Humidity',
    'home.wind_speed': 'Wind',
    'home.visibility': 'Visibility',
    'home.pressure': 'Pressure',
    'home.feels_like': 'Feels like',
    'home.weather_details': 'Weather Details',
    'home.soil_analysis': 'Soil Analysis',
    'home.daily_forecast': '7-Day Weather Forecast',
    'home.soil_moisture': 'Moisture',
    'home.soil_ph': 'pH Level',
    'home.soil_type': 'Soil Type',
    'home.npk_levels': 'Nutrient Levels (NPK)',
    'home.organic_matter': 'Organic Matter',
    'home.drainage': 'Drainage',
    'home.select_crop': 'Crop Type',
    'home.elevation': 'Elevation',
    'home.flood_risk': 'Flood Risk',
    'home.drought_risk': 'Drought Risk',
    'home.land_info': 'Land Information',
    'home.current_location': 'Get current location',
    'home.overview': 'Overview',
    'home.ai_agricultural_advisor': 'AI Agricultural Advisor',
    'home.ask_question': 'Ask about crop management, pest control, irrigation timing, or any farming question...',
    'home.irrigation_timing': 'Irrigation Timing',
    'home.get_optimal_watering': 'Get optimal watering schedule',
    'home.pest_management': 'Pest Management',
    'home.identify_threats': 'Identify potential threats',
    'home.fertilizer_advice': 'Fertilizer Advice',
    'home.optimize_nutrients': 'Optimize nutrient application',
    'home.field_operations': 'Field Operations',
    'home.plan_daily_tasks': 'Plan your daily tasks',
    'home.todays_insights': "Today's Agricultural Insights",
    'home.powered_by_gemini': 'Powered by Gemini AI',
    'home.last_updated': 'Last updated',
    'home.footer_text': 'Smart Farming Dashboard - Empowering farmers with AI-driven agricultural intelligence',
    
    // Chat
    'chat.title': 'AgriSense AI Assistant',
    'chat.subtitle': 'Your farming companion',
    'chat.welcome_title': 'Welcome to AgriSense!',
    'chat.welcome_text': 'Ask me anything about farming, crops, weather, or agricultural practices. I\'m here to help!',
    'chat.placeholder': 'Ask about crops, weather, markets...',
    'chat.send': 'Send',
    'chat.play': 'Play',
    'chat.stop': 'Stop',
    'chat.listening': 'Listening...',
    'chat.take_photo': 'Take Photo',
    'chat.upload_image': 'Upload Image',
    'chat.analyzing_image': 'Analyzing image...',
    'chat.camera_error': 'Camera requires HTTPS. Use file upload instead.',
    'chat.plant_disease_detection': 'Plant Disease Detection',
    'chat.plant_disease_description': 'Upload or capture a photo of your plant to identify diseases and get AI-powered treatment recommendations.',
    'chat.upload_or_capture': 'Upload from gallery or capture with camera',
    
    // Officer
    'officer.login': 'Officer Login',
    'officer.email': 'Email',
    'officer.password': 'Password',
    'officer.login_btn': 'Login',
    'officer.dashboard': 'Officer Dashboard',
    'officer.total_queries': 'Total Queries',
    'officer.pending_queries': 'Pending Queries',
    'officer.answered_queries': 'Answered Queries',
    'officer.recent_queries': 'Recent Queries',
    
    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.continue_guest': 'Continue as Guest',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirm_password': 'Confirm Password',
    'auth.forgot_password': 'Forgot Password?',
    'auth.no_account': 'Don\'t have an account?',
    'auth.have_account': 'Already have an account?',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.close': 'Close',
    'common.today': 'Today',
    'common.excellent': 'Excellent',
    'common.good': 'Good',
    'common.moderate': 'Moderate',
    'common.low': 'Low',
    'common.high': 'High',
    'common.optimal': 'Optimal',
    'common.suitable': 'Suitable',
    'common.available': 'Available',
    'common.not_available': 'Not Available',
    
    // Crops (Indian crops)
    'crops.rice': 'Rice (Paddy)',
    'crops.wheat': 'Wheat',
    'crops.sugarcane': 'Sugarcane',
    'crops.maize': 'Maize',
    'crops.bajra': 'Bajra (Pearl Millet)',
    'crops.jowar': 'Jowar (Sorghum)',
    'crops.arhar': 'Arhar / Tur Dal',
    'crops.cotton': 'Cotton',
    'crops.gram': 'Gram (Chana)',
    'crops.peas': 'Peas',
    'crops.mustard': 'Mustard / Rapeseed',
    'crops.barley': 'Barley',
    'crops.masoor': 'Masoor Dal',
    'crops.potato': 'Potato',
    'crops.coconut': 'Coconut',
    'crops.black_pepper': 'Black Pepper',
    'crops.cardamom': 'Cardamom',
    'crops.rubber': 'Rubber',
    'crops.tea': 'Tea',
    'crops.coffee': 'Coffee',
    'crops.banana': 'Banana',
    'crops.cashew': 'Cashew',
    'crops.ginger': 'Ginger',
    'crops.turmeric': 'Turmeric',
    'crops.tapioca': 'Tapioca',
    'crops.areca_nut': 'Areca Nut',
    'crops.vanilla': 'Vanilla',
    'crops.cocoa': 'Cocoa',
    'crops.nutmeg': 'Nutmeg',
    'crops.cloves': 'Cloves',
    'crops.cinnamon': 'Cinnamon',
    'crops.jackfruit': 'Jackfruit',
    'crops.mango': 'Mango',
    'crops.papaya': 'Papaya',
    'crops.pineapple': 'Pineapple',
    
    // Weather & Soil Details
    'home.current_weather': 'Current Weather',
    'home.ph_level': 'pH Level',
    'home.nitrogen': 'Nitrogen',
    'home.phosphorus': 'Phosphorus',
    'home.potassium': 'Potassium',
    'home.moisture_levels_at': 'Moisture levels at',
    'home.irrigation_recommended': 'irrigation recommended',
    'home.adequate_for_now': 'adequate for now',
    'home.monitor_alert': 'Monitor Alert',
    'home.keep_eye_on': 'Keep an eye on',
    'home.stress_due_weather': 'for any signs of stress due to current weather patterns',
    'home.growth_forecast': 'Growth Forecast',
    'home.conditions_trending': 'Conditions trending positively for',
    'home.development_next_days': 'development over the next few days',
    'home.getting_ai_recommendation': 'Getting AI recommendation...',
    'home.chat': 'Chat',
    'home.weather_favorable': 'Weather Favorable',
    'home.current_conditions_suitable': 'Current conditions are suitable for most field operations and crop growth.',
    'home.footer_dashboard': 'Smart Farming Dashboard - Empowering farmers with AI-driven agricultural intelligence',
    'home.location_label': 'Location',
    'home.last_updated_label': 'Last updated',
    
    // Soil Analysis
    'soil.composition': 'Soil Composition',
    'soil.ph_level': 'pH Level',
    'soil.moisture_content': 'Moisture Content',
    'soil.organic_matter': 'Organic Matter',
    'soil.nutrient_levels': 'Nutrient Levels (NPK)',
    'soil.nitrogen': 'Nitrogen (N)',
    'soil.phosphorus': 'Phosphorus (P)',
    'soil.potassium': 'Potassium (K)',
    'soil.characteristics': 'Soil Characteristics',
    'soil.type': 'Type',
    'soil.drainage': 'Drainage',
    'soil.temperature': 'Temperature',
    'soil.salinity': 'Salinity',
    'soil.land_information': 'Land Information',
    'soil.elevation': 'Elevation',
    'soil.slope': 'Slope',
    'soil.aspect': 'Aspect',
    'soil.land_use': 'Land Use',
    'soil.irrigation_access': 'Irrigation Access',
    'soil.water_source': 'Water Source',
    'soil.optimal_range': 'Optimal range for most crops',
    'soil.acidic_liming': 'Acidic - may need liming',
    'soil.alkaline_sulfur': 'Alkaline - may need sulfur',
    'soil.good_moisture': 'Good moisture level',
    'soil.low_irrigation': 'Low - irrigation needed',
    'soil.high_drainage': 'High - check drainage',
    'soil.excellent_organic': 'Excellent organic content',
    'soil.good_compost': 'Good - consider compost',
    'soil.low_amendments': 'Low - needs organic amendments',
    'soil.nitrogen_desc': 'Essential for leaf growth and chlorophyll',
    'soil.phosphorus_desc': 'Important for root development and flowering',
    'soil.potassium_desc': 'Enhances disease resistance and fruit quality',
    'soil.available': 'Available',
    'soil.not_available': 'Not Available',
    
    // Weather Details
    'weather.current_conditions': 'Current conditions',
    'weather.relative_humidity': 'Relative humidity',
    'weather.speed_direction': 'Speed & direction',
    'weather.atmospheric_pressure': 'Atmospheric pressure',
    'weather.forecast': '6-Day Weather Forecast',
    'weather.forecast_6_day': '6-Day Weather Forecast',
    'weather.hourly_forecast': 'Today\'s Hourly Forecast',
    'weather.today': 'Today',
    'weather.wind': 'Wind',
    'weather.rain_chance': 'Rain chance',
    'weather.max_temp': 'Max',
    'weather.min_temp': 'Min',
    'weather.cloudy': 'cloudy',
    'weather.sunny': 'sunny',
    'weather.rainy': 'rainy',
    'weather.partly_cloudy': 'partly cloudy',
    'weather.clear': 'clear',
    'weather.overcast': 'overcast',
    'weather.overcast_clouds': 'overcast',
    'weather.light_rain': 'light rain',
    'weather.heavy_rain': 'heavy rain',
    'weather.thunderstorm': 'thunderstorm',
    'weather.mist': 'mist',
    'weather.fog': 'fog',
    'weather.broken_clouds': 'broken clouds',
    'weather.scattered_clouds': 'scattered clouds',
    'weather.few_clouds': 'few clouds',
    
    // Dashboard specific translations
    'dashboard.loading_title': 'Loading Your Dashboard',
    'dashboard.loading_subtitle': 'Fetching weather, soil, and land data...',
    'dashboard.back_to_setup': 'Back to Setup',
    'dashboard.quick_insights': 'Quick Insights',
    'dashboard.weather_status': 'Weather Status',
    'dashboard.soil_moisture': 'Soil Moisture',
    'dashboard.ph_level': 'pH Level',
    'dashboard.flood_risk': 'Flood Risk',
    'dashboard.erosion_risk': 'Erosion Risk',
    'dashboard.drought_risk': 'Drought Risk',
    'dashboard.current_conditions': 'Current conditions',
    'dashboard.relative_humidity': 'Relative humidity',
    'dashboard.atmospheric_pressure': 'Atmospheric pressure',
    'dashboard.essential_leaf_growth': 'Essential for leaf growth',
    'dashboard.important_root_development': 'Important for root development',
    'dashboard.enhances_disease_resistance': 'Enhances disease resistance',
    
    // Soil types and characteristics
    'soil.clay_loam': 'Clay Loam',
    'soil.sandy_loam': 'Sandy Loam',
    'soil.loamy': 'Loamy',
    'soil.well_drained': 'Well-drained',
    'soil.moderately_drained': 'Moderately drained',
    
    // AI recommendation prompts
    'ai.provide_shade_protection': 'Provide shade protection due to high temperature',
    'ai.protect_from_frost': 'Protect from frost damage',
    'ai.temperature_suitable': 'Temperature is suitable for field operations',
    'ai.monitor_fungal_diseases': 'Monitor for fungal diseases due to high humidity',
    'ai.pest_monitoring_recommended': 'Pest monitoring recommended',
    
    // Camera component translations
    'camera.review_photo': 'Review Photo',
    'camera.take_photo': 'Take Photo',
    'camera.starting_camera': 'Starting camera...',
    'camera.retake': 'Retake',
    'camera.use_photo': 'Use Photo',
    'camera.cancel': 'Cancel',
    'camera.capture': 'Capture'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const language: Language = 'en';
  const setLanguage = () => {};

  const t = (key: string): string => {
    return translations.en[key as keyof typeof translations.en] || key;
  };

  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Text-to-speech error:', error);
    }
  };

  const value = {
    language,
    setLanguage,
    t,
    speak
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};