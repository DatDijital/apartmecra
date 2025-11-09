import React, { useState, useEffect } from 'react';
import ApiService from '../utils/ApiService';

const PlanEventForm = ({ onClose, onEventPlanned, members }) => {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCategories, setEventCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Location selection states
  const [selectedLocationTypes, setSelectedLocationTypes] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState({});
  const [districts, setDistricts] = useState([]);
  const [towns, setTowns] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [villages, setVillages] = useState([]);
  const [stks, setStks] = useState([]);
  const [mosques, setMosques] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    fetchEventCategories();
    fetchLocations();
  }, []);

  const fetchEventCategories = async () => {
    try {
      setLoadingCategories(true);
      const categories = await ApiService.getEventCategories();
      setEventCategories(categories || []);
    } catch (error) {
      console.error('Error fetching event categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchLocations = async () => {
    try {
      setLoadingLocations(true);
      const [districtsData, townsData, neighborhoodsData, villagesData, stksData, mosquesData] = await Promise.all([
        ApiService.getDistricts().catch(() => []),
        ApiService.getTowns().catch(() => []),
        ApiService.getNeighborhoods().catch(() => []),
        ApiService.getVillages().catch(() => []),
        ApiService.getSTKs().catch(() => []),
        ApiService.getMosques().catch(() => [])
      ]);
      
      setDistricts(districtsData || []);
      setTowns(townsData || []);
      setNeighborhoods(neighborhoodsData || []);
      setVillages(villagesData || []);
      setStks(stksData || []);
      setMosques(mosquesData || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleLocationTypeChange = (type) => {
    setSelectedLocationTypes(prev => {
      if (prev.includes(type)) {
        // Remove type and its locations
        const newTypes = prev.filter(t => t !== type);
        setSelectedLocations(prevLocs => {
          const newLocs = { ...prevLocs };
          delete newLocs[type];
          return newLocs;
        });
        return newTypes;
      } else {
        return [...prev, type];
      }
    });
  };

  const handleLocationChange = (type, locationId) => {
    setSelectedLocations(prev => {
      const current = prev[type] || [];
      if (current.includes(locationId)) {
        return {
          ...prev,
          [type]: current.filter(id => id !== locationId)
        };
      } else {
        return {
          ...prev,
          [type]: [...current, locationId]
        };
      }
    });
  };

  const generateEventLocation = () => {
    const locationParts = [];
    
    selectedLocationTypes.forEach(type => {
      const locationIds = selectedLocations[type] || [];
      if (locationIds.length > 0) {
        let locations = [];
        
        switch(type) {
          case 'district':
            locations = districts.filter(d => locationIds.includes(String(d.id))).map(d => d.name);
            break;
          case 'town':
            locations = towns.filter(t => locationIds.includes(String(t.id))).map(t => t.name);
            break;
          case 'neighborhood':
            locations = neighborhoods.filter(n => locationIds.includes(String(n.id))).map(n => n.name);
            break;
          case 'village':
            locations = villages.filter(v => locationIds.includes(String(v.id))).map(v => v.name);
            break;
          case 'stk':
            locations = stks.filter(s => locationIds.includes(String(s.id))).map(s => s.name);
            break;
          case 'mosque':
            locations = mosques.filter(m => locationIds.includes(String(m.id))).map(m => m.name);
            break;
        }
        
        if (locations.length > 0) {
          const typeLabels = {
            district: 'İlçe',
            town: 'Belde',
            neighborhood: 'Mahalle',
            village: 'Köy',
            stk: 'STK',
            mosque: 'Cami'
          };
          locationParts.push(`${typeLabels[type]}: ${locations.join(', ')}`);
        }
      }
    });
    
    return locationParts.join(' | ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCategoryId) {
      alert('Etkinlik kategorisi seçilmelidir');
      return;
    }
    
    if (!eventDate) {
      alert('Etkinlik tarihi ve saati zorunludur');
      return;
    }
    
    if (selectedLocationTypes.length === 0) {
      alert('En az bir konum türü seçilmelidir');
      return;
    }

    try {
      const selectedCategory = eventCategories.find(cat => cat.id === parseInt(selectedCategoryId));
      const finalEventName = selectedCategory ? selectedCategory.name : '';
      const finalLocation = generateEventLocation();
      
      const eventData = {
        name: finalEventName,
        category_id: selectedCategoryId,
        date: eventDate,
        location: finalLocation,
        description: eventDescription,
        selectedLocationTypes: selectedLocationTypes,
        selectedLocations: selectedLocations,
        isPlanned: true, // Planlanan etkinlik
        attendees: [] // Planlanan etkinlikler için yoklama yok
      };
      
      await ApiService.createEvent(eventData);
      alert('Etkinlik başarıyla planlandı');
      if (onEventPlanned) {
        onEventPlanned();
      }
      onClose();
    } catch (error) {
      console.error('Error planning event:', error);
      alert('Etkinlik planlanırken hata oluştu: ' + error.message);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Etkinlik Planla</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Etkinlik Kategorisi <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">Kategori seçin...</option>
            {eventCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Event Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tarih ve Saat <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        {/* Location Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Konum Türleri <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {['district', 'town', 'neighborhood', 'village', 'stk', 'mosque'].map(type => (
              <label key={type} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLocationTypes.includes(type)}
                  onChange={() => handleLocationTypeChange(type)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {type === 'district' ? 'İlçe' : 
                   type === 'town' ? 'Belde' : 
                   type === 'neighborhood' ? 'Mahalle' : 
                   type === 'village' ? 'Köy' : 
                   type === 'stk' ? 'STK' : 'Cami'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Selected Locations */}
        {selectedLocationTypes.map(type => {
          let locations = [];
          const typeLabels = {
            district: 'İlçe',
            town: 'Belde',
            neighborhood: 'Mahalle',
            village: 'Köy',
            stk: 'STK',
            mosque: 'Cami'
          };

          switch(type) {
            case 'district':
              locations = districts;
              break;
            case 'town':
              locations = towns;
              break;
            case 'neighborhood':
              locations = neighborhoods;
              break;
            case 'village':
              locations = villages;
              break;
            case 'stk':
              locations = stks;
              break;
            case 'mosque':
              locations = mosques;
              break;
          }

          return (
            <div key={type}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {typeLabels[type]} Seçimi
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                {locations.map(location => (
                  <label key={location.id} className="flex items-center space-x-2 p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={(selectedLocations[type] || []).includes(String(location.id))}
                      onChange={() => handleLocationChange(type, String(location.id))}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{location.name}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Açıklama
          </label>
          <textarea
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Etkinlik açıklaması..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition duration-200"
          >
            İptal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition duration-200"
          >
            Planla
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlanEventForm;

