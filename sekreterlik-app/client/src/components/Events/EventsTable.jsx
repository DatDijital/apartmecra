import React, { useState, useEffect } from 'react';
import ApiService from '../../utils/ApiService';

const EventsTable = ({ 
  events, 
  onShowEvent, 
  onEditEvent, 
  onUpdateAttendance, 
  onArchiveEvent, 
  calculateAttendanceStats
}) => {
  const [districts, setDistricts] = useState([]);
  const [towns, setTowns] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [villages, setVillages] = useState([]);
  const [mosques, setMosques] = useState([]);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        const [districtsData, townsData, neighborhoodsData, villagesData, mosquesData] = await Promise.all([
          ApiService.getDistricts(),
          ApiService.getTowns(),
          ApiService.getNeighborhoods(),
          ApiService.getVillages(),
          ApiService.getMosques()
        ]);
        
        setDistricts(districtsData);
        setTowns(townsData);
        setNeighborhoods(neighborhoodsData);
        setVillages(villagesData);
        setMosques(mosquesData);
      } catch (error) {
        console.error('Error fetching location data:', error);
      }
    };

    fetchLocationData();
  }, []);

  // Get location name by type and id
  const getLocationName = (locationType, locationId) => {
    if (!locationId) return '';
    
    // ID'leri string'e çevirerek karşılaştır
    const idStr = String(locationId);
    
    switch (locationType) {
      case 'district':
        const district = districts.find(d => String(d.id) === idStr);
        return district ? district.name : '';
      case 'town':
        const town = towns.find(t => String(t.id) === idStr);
        return town ? town.name : '';
      case 'neighborhood':
        const neighborhood = neighborhoods.find(n => String(n.id) === idStr);
        return neighborhood ? neighborhood.name : '';
      case 'village':
        const village = villages.find(v => String(v.id) === idStr);
        return village ? village.name : '';
      case 'mosque':
        const mosque = mosques.find(m => String(m.id) === idStr);
        return mosque ? mosque.name : '';
      default:
        return '';
    }
  };

  // Get location names for an event
  const getEventLocations = (event) => {
    const locations = {
      districts: [],
      towns: [],
      neighborhoods: [],
      villages: [],
      mosques: []
    };

    if (event.selectedLocationTypes && event.selectedLocations) {
      event.selectedLocationTypes.forEach(locationType => {
        const locationIds = event.selectedLocations[locationType] || [];
        locationIds.forEach(locationId => {
          const name = getLocationName(locationType, locationId);
          if (name) {
            switch (locationType) {
              case 'district':
                locations.districts.push(name);
                break;
              case 'town':
                locations.towns.push(name);
                break;
              case 'neighborhood':
                locations.neighborhoods.push(name);
                break;
              case 'village':
                locations.villages.push(name);
                break;
              case 'mosque':
                locations.mosques.push(name);
                break;
            }
          }
        });
      });
    }

    return locations;
  };

  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Etkinlik bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Henüz hiç etkinlik oluşturulmamış.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Etkinlik Adı
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tarih
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                İlçe
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Belde
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Mahalle
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Köy
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Cami
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Katılan Kişi Sayısı
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {events.map((event) => {
              const stats = calculateAttendanceStats(event);
              const eventLocations = getEventLocations(event);
              return (
                <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{event.name}</div>
                    {event.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {event.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {event.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {eventLocations.districts.length > 0 ? (
                      <div className="space-y-1">
                        {eventLocations.districts.map((name, idx) => (
                          <div key={idx}>{name}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {eventLocations.towns.length > 0 ? (
                      <div className="space-y-1">
                        {eventLocations.towns.map((name, idx) => (
                          <div key={idx}>{name}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {eventLocations.neighborhoods.length > 0 ? (
                      <div className="space-y-1">
                        {eventLocations.neighborhoods.map((name, idx) => (
                          <div key={idx}>{name}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {eventLocations.villages.length > 0 ? (
                      <div className="space-y-1">
                        {eventLocations.villages.map((name, idx) => (
                          <div key={idx}>{name}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {eventLocations.mosques.length > 0 ? (
                      <div className="space-y-1">
                        {eventLocations.mosques.map((name, idx) => (
                          <div key={idx}>{name}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="text-green-600 dark:text-green-400 font-medium text-lg">{stats.attendedCount}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onShowEvent(event)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        title="Göster"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onUpdateAttendance(event)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20"
                        title="Katılım Güncelle"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onEditEvent(event)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Düzenle"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onArchiveEvent(event.id)}
                        className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 transition-colors p-1 rounded-full hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        title="Arşivle"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6m0 0l6-6m-6 6V4" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventsTable;
