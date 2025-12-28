import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cloud, Sun, CloudRain, CloudLightning, Wind, Droplets, 
  MapPin, Calendar, Mail, CheckCircle, AlertCircle, Thermometer,
  Navigation, Trash2, Search, Loader2, Umbrella, Shirt, Activity, X,
  ArrowLeft, RefreshCw, PawPrint, Snowflake, Gauge, Check, ClipboardList
} from 'lucide-react';

// ==========================================
// 1. 全域設定與輔助函式 (Global Helpers)
// ==========================================

// [安全性更新]：API Key 已移至後端 GAS，前端僅保留代理網址
const GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbwkNel5YH41IRsOA-vX5Uh7U82rotRnF7qBhfCVgHE1zcGiBvVDLYtDk_QnD6Kr4rRU/exec"; 

// 透過 GAS 代理請求資料
const CWA_API_URL = `${GAS_PROXY_URL}?type=weather`;
const AQI_API_URL = `${GAS_PROXY_URL}?type=aqi`;
const GAS_SUBSCRIPTION_URL = GAS_PROXY_URL; // 訂閱功能

const REGIONS = {
  all: { name: "🐧 全臺", counties: [] }, 
  north: { name: "❄️ 北部", counties: ["基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "宜蘭縣"] },
  central: { name: "🏔️ 中部", counties: ["苗栗縣", "臺中市", "彰化縣", "南投縣", "雲林縣"] },
  south: { name: "☀️ 南部", counties: ["嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣"] },
  east: { name: "🌊 東部", counties: ["花蓮縣", "臺東縣"] },
  islands: { name: "🏝️ 外島", counties: ["澎湖縣", "金門縣", "連江縣"] }
};

const CITY_ORDER = [
  "基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣", "臺中市", "彰化縣", "南投縣", "雲林縣", 
  "嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣"
];

// 安全 Fetch (簡化版：直接對 GAS 請求)
const safeFetch = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn("Proxy fetch failed. 請檢查 GAS 部署權限是否設為 'Anyone'", e);
    throw e;
  }
};

// 氣象圖示
const getCwaIconUrl = (code) => {
  const safeCode = code ? String(code).padStart(2, '0') : "01";
  return `https://www.cwa.gov.tw/V8/assets/img/weather_icons/weathers/svg_icon/day/${safeCode}.svg`;
};

// 簡易 AQI 狀態 (用於天氣頁面)
const getSimpleAQIStatus = (aqi) => {
  if (!aqi) return { text: '-', color: 'bg-gray-500', textCol: 'text-gray-400' };
  const val = parseInt(aqi);
  if (isNaN(val)) return { text: '-', color: 'bg-gray-500', textCol: 'text-gray-400' };
  
  if (val <= 50) return { text: '良好', color: 'bg-green-500', textCol: 'text-green-400' };
  if (val <= 100) return { text: '普通', color: 'bg-yellow-500', textCol: 'text-yellow-400' };
  if (val <= 150) return { text: '敏感族群不健康', color: 'bg-orange-500', textCol: 'text-orange-400' };
  return { text: '不健康', color: 'bg-red-500', textCol: 'text-red-400' };
};

// 根據時間產生問候語
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了，還沒睡嗎？小企鵝提醒您早點休息 🐧💤";
  if (hour < 11) return "早安！今天是充滿活力的一天 🐧☀️";
  if (hour < 14) return "午安！記得吃午餐補充體力喔 🐧🍱";
  if (hour < 18) return "下午好！今天的空氣還不錯吧？ 🐧✨";
  return "晚安！辛苦了一整天，放鬆一下吧 🐧🌙";
};

// ==========================================
// 2. 共用組件 (Components)
// ==========================================

// AQI 儀表板組件
const AQIGauge = ({ value }) => {
  const radius = 80;
  const stroke = 12;
  const safeValue = typeof value === 'object' ? 0 : Number(value); 
  const normalizedValue = Math.min(Math.max(safeValue || 0, 0), 300);
  const percentage = normalizedValue / 300;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (percentage * circumference);

  let color = '#10b981'; // green
  if (safeValue > 50) color = '#fbbf24'; // yellow
  if (safeValue > 100) color = '#f97316'; // orange
  if (safeValue > 150) color = '#ef4444'; // red
  if (safeValue > 200) color = '#a855f7'; // purple
  if (safeValue > 300) color = '#881337'; // maroon

  return (
    <div className="relative flex flex-col items-center justify-center pt-2">
      <svg width="180" height="100" viewBox="0 0 200 110" className="overflow-visible">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#334155" strokeWidth={stroke} strokeLinecap="round" />
        <path 
          d="M 20 100 A 80 80 0 0 1 180 100" 
          fill="none" 
          stroke={color} 
          strokeWidth={stroke} 
          strokeLinecap="round"
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
        />
      </svg>
      <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
         <span className="text-5xl font-bold text-white drop-shadow-md tracking-tighter">{safeValue || '-'}</span>
         <span className="text-xs text-blue-200 font-bold tracking-widest mt-1">AQI</span>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, message, type = 'success', extraContent }) => {
  if (!isOpen) return null;
  const isError = type === 'error';
  // 手機版優化：w-[90%] 避免撐爆螢幕，max-h-[80vh] 確保高度不超出
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-sm p-6 transform transition-all scale-100 border-4 border-white ring-4 ring-sky-100 overflow-y-auto max-h-[80vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-bold ${isError ? 'text-red-500' : 'text-green-600'}`}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <p className="text-gray-600 mb-6 font-medium whitespace-pre-wrap">{message}</p>
        {extraContent && <div className="mb-6">{extraContent}</div>}
        <button onClick={onClose} className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg">關閉</button>
      </div>
    </div>
  );
};

const ManageSubscriptionModal = ({ isOpen, onClose, email, cities, onUnsubscribe }) => {
    if (!isOpen) return null;
    const [selected, setSelected] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const safeCities = Array.isArray(cities) ? cities : [];

    useEffect(() => { setSelected([]); }, [safeCities]);
    
    const toggleCity = (city) => { 
        if (selected.includes(city)) setSelected(selected.filter(c => c !== city)); 
        else setSelected([...selected, city]); 
    };
    
    const handleSubmit = async () => { 
        if (selected.length === 0) return; 
        setIsSubmitting(true); 
        await onUnsubscribe(selected); 
        setIsSubmitting(false); 
    };

    // 手機版優化：w-[95%] 與 max-h-[90vh]
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sky-900/40 backdrop-blur-md animate-in zoom-in-95">
            <div className="bg-white rounded-[30px] shadow-2xl w-[95%] max-w-lg overflow-hidden flex flex-col max-h-[90vh] border-4 border-white ring-4 ring-sky-100">
                <div className="bg-cyan-400 px-6 py-5 flex justify-between items-center relative overflow-hidden shrink-0">
                     <div className="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-2">
                        <ClipboardList className="w-24 h-24 text-white" />
                     </div>
                    <div className="flex items-center space-x-3 text-white relative z-10">
                        <span className="text-3xl">📝</span>
                        <h3 className="text-xl font-black tracking-wide">管理訂閱清單</h3>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-white relative z-10">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-8 overflow-y-auto bg-sky-50/50 custom-scrollbar grow">
                    <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-sky-100 flex items-center gap-3">
                        <div className="bg-sky-100 p-2 rounded-full text-sky-600"><Mail className="w-5 h-5"/></div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subscriber</p>
                            <p className="text-gray-800 font-bold break-all">{email}</p>
                        </div>
                    </div>
                    {safeCities.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <span className="text-4xl block mb-2">📭</span>
                            <p className="font-medium">目前沒有訂閱任何縣市喔！</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sky-700 mb-3 font-bold text-sm flex items-center">
                                <Trash2 className="w-4 h-4 mr-2" /> 勾選想取消的縣市：
                            </p>
                            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                {safeCities.map(city => (
                                    <label key={city} className={`flex items-center space-x-3 cursor-pointer p-3 rounded-2xl transition-all border-2 shadow-sm ${selected.includes(city) ? 'border-rose-300 bg-rose-50 ring-2 ring-rose-200 ring-offset-1' : 'border-white bg-white hover:bg-sky-50 hover:border-sky-200'}`}>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected.includes(city) ? 'border-rose-400 bg-rose-400 text-white' : 'border-gray-200 bg-gray-50'}`}>
                                            {selected.includes(city) && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                        <input type="checkbox" checked={selected.includes(city)} onChange={() => toggleCity(city)} className="hidden" />
                                        <span className={`font-bold ${selected.includes(city) ? 'text-rose-600' : 'text-gray-600'}`}>{city}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="bg-white px-6 py-4 flex justify-between items-center border-t border-gray-100 shrink-0">
                    <span className="text-sm text-gray-400 font-medium pl-2 hidden sm:inline">{selected.length > 0 ? `已選 ${selected.length} 個地點` : ''}</span>
                    <div className="flex gap-3 w-full sm:w-auto justify-end">
                        <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 font-bold text-sm transition-all">關閉</button>
                        {safeCities.length > 0 && (
                            <button onClick={handleSubmit} disabled={selected.length === 0 || isSubmitting} className={`px-6 py-2.5 bg-rose-400 text-white rounded-full hover:bg-rose-500 font-bold text-sm shadow-lg shadow-rose-200 flex items-center transition-all ${(selected.length === 0 || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />處理中</> : '取消訂閱'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 3. 北極熊空品觀察站 (AQI Dashboard)
// ==========================================
const AQIDashboard = ({ onNavigate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('all');

  // 詳細 AQI 狀態
  const getDetailedAQIStatus = (aqi) => {
    const val = parseInt(aqi);
    if (isNaN(val)) return { text: "未知", color: "from-gray-400 to-gray-500", textColor: "text-gray-900", icon: "❓" };
    if (val <= 50) return { text: "良好", color: "from-emerald-400 to-green-500", textColor: "text-emerald-900", icon: "😊" };
    if (val <= 100) return { text: "普通", color: "from-yellow-400 to-amber-500", textColor: "text-yellow-900", icon: "😐" };
    if (val <= 150) return { text: "對敏感族群不健康", color: "from-orange-400 to-orange-500", textColor: "text-orange-900", icon: "😷" };
    if (val <= 200) return { text: "對所有族群不健康", color: "from-red-400 to-red-600", textColor: "text-red-900", icon: "😠" };
    if (val <= 300) return { text: "非常不健康", color: "from-purple-500 to-purple-700", textColor: "text-purple-900", icon: "🤒" };
    return { text: "危害", color: "from-red-600 to-red-800", textColor: "text-red-900", icon: "💀" };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const json = await safeFetch(AQI_API_URL);
        if (json && json.records) {
          const formattedData = json.records.map(item => ({
            site: item.sitename,
            county: item.county,
            aqi: item.aqi,
            status: item.status,
            pm25: item['pm2.5'],
            pm10: item.pm10,
            o3: item.o3,
            no2: item.no2,
            publishtime: item.publishtime
          }));
          setData(formattedData);
        }
      } catch (e) {
        console.warn("AQI fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (selectedRegion === 'all') return data;
    const targetCounties = REGIONS[selectedRegion]?.counties || [];
    return data.filter(item => targetCounties.includes(item.county));
  }, [data, selectedRegion]);

  return (
    <div className="min-h-screen bg-slate-900 font-sans relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-[30%] right-[30%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{ animationDelay: "4s" }}></div>
      </div>

      <div className="relative z-10">
        <header className="backdrop-blur-md bg-white/10 border-b border-white/10 py-4 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Left side: Title and Icon */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className="text-3xl animate-[waddle_2s_infinite_ease-in-out] origin-bottom inline-block">🐻‍❄️</div>
                    <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-teal-200 to-cyan-200 bg-clip-text text-transparent">
                      北極熊空品觀察站
                    </h1>
                  </div>
                </div>
              </div>

              {/* Right side: Navigation Button + Data Source */}
              <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3">
                 <button onClick={onNavigate} className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/30 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transform hover:-translate-y-0.5 transition-all border border-white/20 whitespace-nowrap">
                    <div className="text-xl animate-[waddle_2s_infinite_ease-in-out] origin-bottom inline-block">🐧</div> <span className="hidden sm:inline">小企鵝臺灣氣象站</span><span className="sm:hidden">天氣</span>
                 </button>

                 <div className="text-[10px] md:text-xs text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                   環境部開放資料
                 </div>
              </div>
            </div>
          </div>
        </header>

        <div className="backdrop-blur-sm bg-white/5 py-4 border-b border-white/5">
          <div className="container mx-auto px-4">
            {/* 手機版優化：使用 flex-wrap 避免按鈕超出螢幕 */}
            <div className="flex gap-2 justify-center flex-wrap">
              {Object.entries(REGIONS).map(([key, region]) => (
                <button
                  key={key}
                  onClick={() => setSelectedRegion(key)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all ${
                    selectedRegion === key
                      ? "bg-gradient-to-r from-emerald-500 to-purple-600 text-white shadow-lg shadow-purple-500/20 transform -translate-y-0.5"
                      : "bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white border border-white/10"
                  }`}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredData.map((record, index) => {
                const status = getDetailedAQIStatus(record.aqi);
                return (
                  <div key={index} className="group relative transition-all duration-300 hover:-translate-y-1">
                    <div className="relative backdrop-blur-md bg-gradient-to-br from-emerald-900/40 via-slate-900/40 to-purple-900/40 border border-white/20 rounded-xl p-4 shadow-lg hover:shadow-cyan-500/20 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className="font-bold text-white tracking-wide">{record.site}</h3>
                          <p className="text-xs text-cyan-200/80">{record.county}</p>
                        </div>
                        <span className="text-2xl drop-shadow-md opacity-80">{status.icon}</span>
                      </div>

                      <div className={`bg-gradient-to-br ${status.color} rounded-lg p-3 mb-3 text-white shadow-md border border-white/10 mt-2`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-medium opacity-90">AQI 指數</p>
                            <p className="text-2xl font-bold drop-shadow-sm">{record.aqi || "N/A"}</p>
                          </div>
                          <Gauge className="h-8 w-8 opacity-40" />
                        </div>
                        <p className="text-xs mt-1 font-bold">{status.text}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <div className="bg-white/10 rounded p-2 backdrop-blur-sm border border-white/5">
                          <p className="text-[10px] text-cyan-200/70">PM2.5</p>
                          <p className="font-bold text-white">{record.pm25 || "-"}</p>
                        </div>
                        <div className="bg-white/10 rounded p-2 backdrop-blur-sm border border-white/5">
                          <p className="text-[10px] text-cyan-200/70">PM10</p>
                          <p className="font-bold text-white">{record.pm10 || "-"}</p>
                        </div>
                        <div className="bg-white/10 rounded p-2 backdrop-blur-sm border border-white/5">
                          <p className="text-[10px] text-cyan-200/70">O3</p>
                          <p className="font-bold text-white">{record.o3 || "-"}</p>
                        </div>
                        <div className="bg-white/10 rounded p-2 backdrop-blur-sm border border-white/5">
                          <p className="text-[10px] text-cyan-200/70">NO2</p>
                          <p className="font-bold text-white">{record.no2 || "-"}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-slate-400 text-right">
                        更新: {record.publishtime ? new Date(record.publishtime).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {!loading && filteredData.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <p>此區域暫無監測資料</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. 小企鵝氣象站 (Weather Dashboard)
// ==========================================
const WeatherDashboard = ({ onNavigate }) => {
  const [selectedCity, setSelectedCity] = useState('');
  const [currentTab, setCurrentTab] = useState('all');
  const [weatherMap, setWeatherMap] = useState({}); 
  const [aqiData, setAqiData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('subscribe'); 
  const [email, setEmail] = useState('');
  const [subCity, setSubCity] = useState('臺北市');
  const [subStatus, setSubStatus] = useState('idle'); 
  const [mySubscriptions, setMySubscriptions] = useState([]); 
  const [queryLoading, setQueryLoading] = useState(false);
  const [deletingCity, setDeletingCity] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'success', extraContent: null });
  const [manageModalOpen, setManageModalOpen] = useState(false);

  // 根據時間產生問候語
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "夜深了，還沒睡嗎？小企鵝提醒您早點休息 🐧💤";
    if (hour < 11) return "早安！今天是充滿活力的一天 🐧☀️";
    if (hour < 14) return "午安！記得吃午餐補充體力喔 🐧🍱";
    if (hour < 18) return "下午好！今天的空氣還不錯吧？ 🐧✨";
    return "晚安！辛苦了一整天，放鬆一下吧 🐧🌙";
  };
  const greeting = getGreeting();

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setError(null);
      try {
        try {
          const aqiJson = await safeFetch(AQI_API_URL);
          if (aqiJson && aqiJson.records) {
            const aqiMap = {};
            aqiJson.records.forEach(r => {
              if (!aqiMap[r.county]) aqiMap[r.county] = { 
                aqi: r.aqi, 
                pm25: r['pm2.5'] // 抓取 pm2.5
              };
            });
            setAqiData(aqiMap);
          }
        } catch (e) { console.warn("Simple AQI fetch warning:", e); }

        const wData = await safeFetch(CWA_API_URL);
        if (wData && wData.success === "true") {
          const processedMap = processAllCWAData(wData);
          setWeatherMap(processedMap);
        } else {
          throw new Error("無法取得有效的氣象資料");
        }
      } catch (err) {
        console.error("Critical Error:", err);
        setError("資料載入失敗，請檢查網路連線");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const processAllCWAData = (data) => {
    let locations = data.records?.Locations?.[0]?.Location || data.records?.locations?.[0]?.location || [];
    const resultMap = {};

    locations.forEach(location => {
      const locName = location.LocationName || location.locationName;
      const weatherElements = location.WeatherElement || location.weatherElement;
      const getEl = (names) => weatherElements.find(el => names.includes(el.ElementName || el.elementName));

      const wxEl = getEl(["Wx", "天氣現象"]);
      const minTEl = getEl(["MinT", "最低溫度"]);
      const maxTEl = getEl(["MaxT", "最高溫度"]);
      const popEl = getEl(["PoP12h", "12小時降雨機率"]);
      const ciEl = getEl(["CI", "舒適度指數", "最小舒適度指數"]);

      const dailyForecasts = Array.from({ length: 7 }).map((_, dayIndex) => {
        const timeIndex = dayIndex * 2; 
        const timeObj = wxEl?.Time?.[timeIndex] || wxEl?.time?.[timeIndex];
        const startTime = timeObj ? new Date(timeObj.StartTime || timeObj.startTime) : new Date();

        const getValue = (el, idx, possibleKeys) => {
          const tEntry = el?.Time?.[idx] || el?.time?.[idx];
          const valArr = tEntry?.ElementValue || tEntry?.elementValue;
          if (!valArr || valArr.length === 0) return "-";
          const valObj = valArr[0];
          for (const k of possibleKeys) { if (valObj[k] !== undefined) return valObj[k]; }
          return valObj.value || valObj.parameterName || "-";
        };

        const getWxCode = (el, idx) => {
          const tEntry = el?.Time?.[idx] || el?.time?.[idx];
          const valArr = tEntry?.ElementValue || tEntry?.elementValue;
          if (!valArr) return "01";
          return valArr[0]?.WeatherCode || valArr[1]?.value || "01";
        };

        return {
          date: startTime,
          text: getValue(wxEl, timeIndex, ["Weather"]),
          code: getWxCode(wxEl, timeIndex),
          min: getValue(minTEl, timeIndex, ["MinTemperature"]),
          max: getValue(maxTEl, timeIndex, ["MaxTemperature"]),
          pop: getValue(popEl, timeIndex, ["ProbabilityOfPrecipitation"]),
          ci: getValue(ciEl, timeIndex, ["MinComfortIndexDescription", "ComfortIndexDescription"])
        };
      });

      resultMap[locName] = { name: locName, daily: dailyForecasts, current: dailyForecasts[0] };
    });
    return resultMap;
  };

  const filteredCityNames = useMemo(() => {
    let result = [];
    if (selectedCity) result = [selectedCity];
    else if (currentTab !== 'all') result = REGIONS[currentTab].counties;
    else result = CITY_ORDER;
    return result.sort((a, b) => CITY_ORDER.indexOf(a) - CITY_ORDER.indexOf(b));
  }, [selectedCity, currentTab]);

  const handleGAS = async (action, targetCity) => {
    if (!email) { setModalConfig({ isOpen: true, title: '提示', message: '請輸入 Email', type: 'error' }); return; }
    if ((action === 'subscribe') && !targetCity) { setModalConfig({ isOpen: true, title: '提示', message: '請選擇城市', type: 'error' }); return; }

    if (action === 'subscribe' || action === 'unsubscribe') setSubStatus('loading');
    else setQueryLoading(true);

    try {
      if (action === 'query') {
        const url = `${GAS_SUBSCRIPTION_URL}?action=query&email=${encodeURIComponent(email)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.result === 'success') {
            setMySubscriptions(json.data);
            if(json.data.length === 0) setModalConfig({ isOpen: true, title: '查詢結果', message: '查無訂閱紀錄', type: 'error' });
        }
      } else {
        const params = new URLSearchParams();
        params.append('email', email);
        params.append('city', targetCity);
        params.append('action', action);
        await fetch(GAS_SUBSCRIPTION_URL, { method: 'POST', body: params, mode: 'no-cors' });
        
        if (action === 'subscribe') {
            setSubStatus('idle');
            setModalConfig({ isOpen: true, title: '訂閱成功', message: `已訂閱 ${targetCity}！`, type: 'success' });
        }
        if (action === 'unsubscribe') {
           setMySubscriptions(prev => prev.filter(c => c !== targetCity));
           setDeletingCity(null);
           setModalConfig({ isOpen: true, title: '取消成功', message: `已取消 ${targetCity} 訂閱`, type: 'success' });
        }
      }
    } catch (err) {
      console.error(err);
      if (action !== 'query') { setSubStatus('error'); setModalConfig({ isOpen: true, title: '錯誤', message: '連線失敗', type: 'error' }); }
    } finally {
      if (action === 'query') setQueryLoading(false);
    }
  };
  
  const handleBatchUnsubscribe = async (citiesToRemove) => {
      // 批次取消 (前端模擬逐一發送，或後端支援)
      for (const city of citiesToRemove) {
          await handleGAS('unsubscribe', city);
      }
      setManageModalOpen(false);
  };

  const mainCityData = selectedCity ? weatherMap[selectedCity] : (filteredCityNames.length > 0 ? weatherMap[filteredCityNames[0]] : null);
  const current = mainCityData?.current || {};
  const currentAqi = mainCityData ? aqiData[mainCityData.name] : null;
  const aqiInfo = getSimpleAQIStatus(currentAqi?.aqi);
  const todayTempRange = (current.min && current.max) ? `${current.min}° - ${current.max}°` : "--";
  const displayTemp = (current.min && current.max && !isNaN(current.min)) ? Math.round((parseInt(current.min) + parseInt(current.max)) / 2) : "--";

  const scrollToSubscribe = () => {
    const element = document.getElementById('subs-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white font-sans selection:bg-blue-500 selection:text-white pb-10">
      <nav className="fixed top-0 w-full z-50 bg-slate-900/50 backdrop-blur-md border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex flex-col md:flex-row items-center justify-between w-full">
            <div className="flex items-center space-x-2 py-2 md:py-0">
               {/* 擺動的小企鵝與標題 */}
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3">
                    {/* 標題與企鵝 */}
                    <div className="flex items-center gap-2">
                      <div className="text-3xl animate-[waddle_2s_infinite_ease-in-out] origin-bottom inline-block">🐧</div>
                      <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                        小企鵝臺灣氣象站
                      </h1>
                    </div>
                    {/* 親切問候語 (手機版隱藏以節省空間) */}
                    <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 shadow-sm hidden lg:block">
                      <p className="text-xs text-cyan-200 font-medium whitespace-nowrap">
                         {greeting}
                      </p>
                    </div>
                  </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 py-2 md:py-0">
               {/* 切換按鈕 (手機版文字簡化) */}
               <button onClick={onNavigate} className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/30 px-3 md:px-4 py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm flex items-center gap-2 transform hover:-translate-y-0.5 transition-all border border-white/20 whitespace-nowrap">
                  <div className="text-lg md:text-xl animate-[waddle_2s_infinite_ease-in-out] origin-bottom inline-block">🐻‍❄️</div> <span className="hidden sm:inline">北極熊空品觀察站</span><span className="sm:hidden">空品</span>
               </button>

               <div className="relative group block w-32 md:w-48">
                  <select className="appearance-none bg-slate-800/50 border border-white/10 rounded-full py-1.5 pl-4 pr-8 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-slate-800 transition-colors w-full"
                    value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); if(e.target.value) setCurrentTab('all'); }}>
                    <option value="">想去哪裡玩</option>
                    {CITY_ORDER.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-32 md:pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 animate-spin text-blue-400"/></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-300"><AlertCircle className="w-10 h-10 mb-2"/><p>{error}</p></div>
        ) : (
          <>
            {/* Hero Section */}
            {selectedCity && mainCityData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 animate-in fade-in zoom-in duration-300">
                <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 backdrop-blur-xl border border-white/20 p-6 md:p-8 shadow-2xl">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-start h-full">
                    <div className="text-center md:text-left mb-6 md:mb-0">
                      <div className="flex items-center justify-center md:justify-start space-x-2 text-blue-200 mb-2">
                        <MapPin className="w-5 h-5" />
                        <span className="text-lg font-medium">{mainCityData.name}</span>
                      </div>
                      <h1 className="text-7xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200">{displayTemp}°</h1>
                      <p className="text-2xl text-blue-100 font-light mt-2">{current.text}</p>
                      <div className="flex items-center justify-center md:justify-start space-x-4 mt-6 text-sm text-blue-200/80">
                        <span className="flex items-center"><Thermometer className="w-4 h-4 mr-1" /> {todayTempRange}</span>
                      </div>
                      <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
                         <div className="bg-blue-500/20 text-blue-100 border border-blue-400/30 px-3 py-1.5 rounded-lg flex items-center text-sm font-bold shadow-sm">
                            <Umbrella className="w-4 h-4 mr-1.5" /> 
                            降雨機率 {current.pop}%
                         </div>
                         <div className="bg-purple-500/20 text-purple-100 border border-purple-400/30 px-3 py-1.5 rounded-lg flex items-center text-sm font-bold shadow-sm">
                            <Cloud className="w-4 h-4 mr-1.5" /> 
                            PM2.5: {currentAqi?.pm25 || "-"}
                         </div>
                      </div>
                    </div>
                    <div className="mt-2 md:mt-0 w-32 h-32 md:w-48 md:h-48 drop-shadow-[0_0_35px_rgba(59,130,246,0.5)] bg-white/10 rounded-full p-4 flex items-center justify-center backdrop-blur-sm">
                      <img src={getCwaIconUrl(current.code)} alt={current.text} className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 md:space-y-6">
                  {/* 空氣品質區塊 - 改用儀表板顯示 */}
                  <div className="rounded-3xl bg-slate-800/40 backdrop-blur-md border border-white/10 p-6 flex flex-col justify-between h-[200px] overflow-hidden">
                    <div className="flex justify-between items-start z-10 relative">
                      <h3 className="text-slate-300 font-medium flex items-center gap-2"><Wind className="w-5 h-5" /> 空氣品質</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${aqiInfo.color} text-white shadow-sm`}>{aqiInfo.text}</span>
                    </div>
                    <div className="mt-[-20px] scale-100 origin-bottom flex-1 flex items-center justify-center">
                       <AQIGauge value={currentAqi ? currentAqi.aqi : 0} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 px-2 pb-2 border-t border-white/10 pt-2">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div><span className="text-[10px] text-slate-300">0-50 良好</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#fbbf24]"></div><span className="text-[10px] text-slate-300">51-100 普通</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f97316]"></div><span className="text-[10px] text-slate-300">101-150 敏感</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ef4444]"></div><span className="text-[10px] text-slate-300">151-200 不健康</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#a855f7]"></div><span className="text-[10px] text-slate-300">201-300 非常不健康</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#881337]"></div><span className="text-[10px] text-slate-300">301+ 危害</span></div>
                    </div>
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 rounded-3xl bg-orange-900/20 backdrop-blur-md border border-white/10 p-4 flex flex-col items-center justify-center text-center">
                         <Activity className="w-6 h-6 text-orange-400 mb-1" /><div className="text-xs text-slate-400 font-bold mb-1">舒適度</div><div className="text-sm font-bold text-white truncate w-full px-1">{current.ci}</div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* Region Tabs */}
            {!selectedCity && (
              <div className="flex flex-wrap gap-2 mb-8 justify-center animate-in slide-in-from-bottom-4 duration-500">
                {Object.entries(REGIONS).map(([key, region]) => (
                  <button key={key} onClick={() => setCurrentTab(key)} className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-300 shadow-sm ${currentTab === key ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white border border-white/5'}`}>
                    {region.name}
                  </button>
                ))}
              </div>
            )}

            {/* Weekly Forecast Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-400" /> 一周天氣預報</h2>
                <button 
                  onClick={scrollToSubscribe}
                  className="bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white shadow-lg px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transform hover:-translate-y-0.5 transition-all"
                >
                  <Mail className="w-4 h-4" /> <span className="hidden sm:inline">訂閱服務</span><span className="sm:hidden">訂閱</span>
                </button>
              </div>
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-300 border-b border-white/10">
                        <th className="p-4 pl-6 sticky left-0 bg-slate-800 z-10 w-32 font-bold shadow-[2px_0_5px_rgba(0,0,0,0.3)]">縣市</th>
                        {/* 日期標頭 */}
                        {Array.from({length: 7}).map((_, i) => {
                           const d = new Date(); d.setDate(d.getDate() + i);
                           return <th key={i} className="p-4 text-center min-w-[100px]"><div className="text-white font-bold">{d.getMonth()+1}/{d.getDate()}</div><div className="text-xs font-normal text-slate-500">({["日","一","二","三","四","五","六"][d.getDay()]})</div></th>
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {filteredCityNames.map((cityName) => {
                        const locData = weatherMap[cityName];
                        if (!locData) return null;
                        return (
                          <tr key={cityName} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4 pl-6 font-bold text-white sticky left-0 bg-slate-900/90 z-10 border-r border-white/5 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                              {cityName}
                            </td>
                            {locData.daily.map((day, idx) => (
                              <td key={idx} className="p-2 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <img src={getCwaIconUrl(day.code)} alt={day.text} className="w-8 h-8" title={day.text} />
                                  <span className="text-xs text-slate-300 hidden md:block">{day.text}</span>
                                  <span className="font-bold text-white">{day.min}°-{day.max}°</span>
                                </div>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Subscription Section */}
            <div id="subs-section" className="mt-12 rounded-3xl overflow-hidden relative min-h-[400px]">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-80"></div>
              <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-start justify-between gap-12">
                <div className="max-w-md">
                  <h2 className="text-3xl font-bold text-white mb-4">天氣快報服務</h2>
                  <p className="text-blue-100 mb-6">
                    訂閱我們，每天早上05:00~06:00收到精準的天氣預報。<br/>
                    資料來源：中央氣象局API
                  </p>
                  <div className="flex space-x-4 mb-8">
                     <button onClick={() => { setActiveTab('subscribe'); setSubStatus('idle'); }} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'subscribe' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}>我要訂閱</button>
                     <button onClick={() => { setActiveTab('manage'); setMySubscriptions([]); }} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'manage' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}>管理我的訂閱</button>
                  </div>
                </div>
                <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-xl">
                  {activeTab === 'subscribe' && (
                    <form onSubmit={(e) => { e.preventDefault(); handleGAS('subscribe', subCity); }} className="space-y-4">
                      <h3 className="text-xl font-semibold text-white mb-4">新增訂閱</h3>
                      <div><label className="block text-sm font-medium text-blue-100 mb-1">選擇關注城市</label><select className="w-full bg-slate-800/50 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-400 outline-none" value={subCity} onChange={(e) => setSubCity(e.target.value)}>{CITY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                      <div><label className="block text-sm font-medium text-blue-100 mb-1">Email 信箱</label><input type="email" required placeholder="name@example.com" className="w-full bg-slate-800/50 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-400 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                      <button type="submit" disabled={subStatus === 'loading'} className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2">{subStatus === 'loading' ? '處理中...' : '確認訂閱'}</button>
                    </form>
                  )}
                  {activeTab === 'manage' && (
                    <div className="space-y-4">
                       <h3 className="text-xl font-semibold text-white mb-4">查詢或取消訂閱</h3>
                       <div className="flex gap-2">
                          <input type="email" required placeholder="輸入您的 Email 查詢" className="w-full bg-slate-800/50 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-400 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
                           <button onClick={() => handleGAS('query')} disabled={queryLoading} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg flex items-center justify-center min-w-[3rem]">{queryLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5" />}</button>
                       </div>
                       <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                          {mySubscriptions.map((city) => (
                             <div key={city} className="flex items-center justify-between bg-white/10 p-3 rounded-lg border border-white/10"><span className="text-white">{city}</span><button onClick={() => { setDeletingCity(city); handleGAS('unsubscribe', city); }} disabled={deletingCity === city} className="text-slate-400 hover:text-red-300 p-2 rounded-full">{deletingCity === city ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button></div>
                          ))}
                          {!queryLoading && mySubscriptions.length === 0 && email && <div className="text-center text-slate-400 text-sm">查無訂閱紀錄</div>}
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <ManageSubscriptionModal 
            isOpen={manageModalOpen} 
            onClose={() => setManageModalOpen(false)} 
            email={email} 
            cities={mySubscriptions} 
            onUnsubscribe={handleBatchUnsubscribe} 
      />
      <Modal isOpen={modalConfig.isOpen} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} title={modalConfig.title} message={modalConfig.message} type={modalConfig.type} />
      <footer className="border-t border-white/10 bg-slate-900/50 backdrop-blur-md py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm space-y-2">
          <p>2025 Taiwan Weather Info. Data provided by CWA (氣象局) & MOENV (環境部).</p>
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
            <span>UI Design 小企鵝團隊製作</span>
            <span className="text-lg animate-[waddle_2s_infinite_ease-in-out]">🐧</span>
          </div>
        </div>
      </footer>
      <style>{`@keyframes waddle { 0% { transform: rotate(0deg); } 25% { transform: rotate(5deg); } 75% { transform: rotate(-5deg); } 100% { transform: rotate(0deg); } }`}</style>
    </div>
  );
};

// ==========================================
// 主入口
// ==========================================
const App = () => {
  const [currentPage, setCurrentPage] = useState('weather'); // 'weather' | 'aqi'
  return currentPage === 'aqi' ? <AQIDashboard onNavigate={() => setCurrentPage('weather')} /> : <WeatherDashboard onNavigate={() => setCurrentPage('aqi')} />;
};

export default App;