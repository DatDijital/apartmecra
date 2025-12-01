import React, { useState, useEffect } from 'react';
import ApiService from '../utils/ApiService';

const PlanMeetingForm = ({ onClose, onMeetingPlanned, regions }) => {
  const [meetingName, setMeetingName] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [selectedRegions, setSelectedRegions] = useState([]);

  const handleRegionChange = (region) => {
    setSelectedRegions(prev => {
      if (prev.includes(region)) {
        return prev.filter(r => r !== region);
      } else {
        return [...prev, region];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!meetingName.trim()) {
      alert('Toplantı adı zorunludur');
      return;
    }
    
    if (!meetingDate) {
      alert('Toplantı tarihi ve saati zorunludur');
      return;
    }
    
    if (selectedRegions.length === 0) {
      alert('En az bir bölge seçilmelidir');
      return;
    }

    try {
      const meetingData = {
        name: meetingName,
        date: meetingDate,
        notes: meetingNotes,
        regions: selectedRegions,
        isPlanned: true, // Planlanan toplantı
        attendees: [] // Planlanan toplantılar için yoklama yok
      };
      
      await ApiService.createMeeting(meetingData);
      alert('Toplantı başarıyla planlandı');
      if (onMeetingPlanned) {
        onMeetingPlanned();
      }
      onClose();
    } catch (error) {
      console.error('Error planning meeting:', error);
      alert('Toplantı planlanırken hata oluştu: ' + error.message);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Toplantı Planla</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meeting Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Toplantı Adı <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={meetingName}
            onChange={(e) => setMeetingName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Toplantı adını girin"
            required
          />
        </div>

        {/* Meeting Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tarih ve Saat <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        {/* Regions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bölgeler <span className="text-red-500">*</span>
          </label>
          <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
            {regions && regions.length > 0 ? (
              regions.map(region => (
                <label key={region.id} className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                  <input
                    type="checkbox"
                    checked={selectedRegions.includes(region.name)}
                    onChange={() => handleRegionChange(region.name)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{region.name}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500">Henüz bölge eklenmemiş</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notlar
          </label>
          <textarea
            value={meetingNotes}
            onChange={(e) => setMeetingNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Toplantı notları..."
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

export default PlanMeetingForm;

