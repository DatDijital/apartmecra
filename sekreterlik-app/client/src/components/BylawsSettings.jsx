import React, { useState, useEffect } from 'react';
import ApiService from '../utils/ApiService';
import FirebaseService from '../services/FirebaseService';

const BylawsSettings = () => {
  const [bylawsText, setBylawsText] = useState('');
  const [bylawsUrl, setBylawsUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    loadBylaws();
  }, []);

  const loadBylaws = async () => {
    try {
      setLoading(true);
      
      // Firebase'den tüzük metnini yükle
      const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true';
      
      if (USE_FIREBASE) {
        try {
          const bylaws = await FirebaseService.getById('bylaws', 'main');
          if (bylaws) {
            if (bylaws.text) {
              setBylawsText(bylaws.text);
            }
            if (bylaws.url) {
              setBylawsUrl(bylaws.url);
            }
          }
        } catch (error) {
          console.error('Error loading bylaws:', error);
          // Tüzük yoksa, boş bırak
        }
      }
    } catch (error) {
      console.error('Error loading bylaws:', error);
      setMessage('Tüzük yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      // En az URL veya metin olmalı
      if (!bylawsText.trim() && !bylawsUrl.trim()) {
        setMessage('Lütfen tüzük metnini girin veya tüzük linkini ekleyin');
        return;
      }

      // Firebase'e kaydet
      const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true';
      
      if (USE_FIREBASE) {
        const bylawsData = {
          updated_at: new Date().toISOString()
        };
        
        if (bylawsText.trim()) {
          bylawsData.text = bylawsText.trim();
        }
        
        if (bylawsUrl.trim()) {
          bylawsData.url = bylawsUrl.trim();
        }
        
        // setDoc kullanarak kaydet (id: 'main', encrypt: false - tüzük metni şifrelenmemeli)
        await FirebaseService.create('bylaws', 'main', bylawsData, false);
        
        setMessage('Tüzük başarıyla kaydedildi');
      }
    } catch (error) {
      console.error('Error saving bylaws:', error);
      setMessage('Tüzük kaydedilirken hata oluştu: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    // Sadece metin dosyalarını kabul et
    if (uploadedFile.type === 'text/plain' || uploadedFile.name.endsWith('.txt')) {
      setFile(uploadedFile);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setBylawsText(event.target.result);
        setMessage('Dosya yüklendi. Lütfen kaydet butonuna basın.');
      };
      reader.readAsText(uploadedFile);
    } else {
      setMessage('Lütfen sadece .txt dosyası yükleyin');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Parti Tüzüğü Yönetimi
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Parti tüzüğünü yükleyin veya düzenleyin. Bu tüzük, AI asistanı tarafından kullanılacaktır.
        </p>
      </div>

      {/* URL Input */}
      <div className="bg-indigo-50 dark:bg-indigo-900 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tüzük Web Linki (Önerilen)
        </label>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          Tüzük metni çok uzunsa, web linkini kullanabilirsiniz. AI asistanı bu linki kullanacaktır.
        </p>
        <div className="flex space-x-2">
          <input
            type="url"
            value={bylawsUrl}
            onChange={(e) => setBylawsUrl(e.target.value)}
            placeholder="https://yenidenrefahpartisi.org.tr/page/parti-tuzugu/12"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Örnek: https://yenidenrefahpartisi.org.tr/page/parti-tuzugu/12
        </p>
      </div>

      {/* File Upload */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tüzük Dosyası Yükle (.txt)
        </label>
        <input
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Sadece .txt formatında dosya yükleyebilirsiniz
        </p>
      </div>

      {/* Text Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tüzük Metni
        </label>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          Tüzük metnini buraya yapıştırın. Chatbot bu metni kullanarak tüzük hakkında soruları yanıtlayacaktır.
        </p>
        <textarea
          value={bylawsText}
          onChange={(e) => setBylawsText(e.target.value)}
          rows={30}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
          placeholder="Tüzük metnini buraya yapıştırın veya yukarıdaki butondan dosya yükleyin..."
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {bylawsText.length} karakter
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('başarıyla') 
            ? 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200' 
            : 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
};

export default BylawsSettings;

