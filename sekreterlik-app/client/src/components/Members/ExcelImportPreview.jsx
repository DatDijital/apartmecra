import React from 'react';

const ExcelImportPreview = ({ 
  previewData, 
  onConfirm, 
  onCancel, 
  loading = false 
}) => {
  if (!previewData) return null;

  const { newMembers = [], updatedMembers = [], errors = [] } = previewData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 border-b border-gray-200">
          <h2 className="text-xl font-bold text-white">Excel İçe Aktarma Önizleme</h2>
          <p className="text-sm text-green-50 mt-1">
            Lütfen tespit edilen üyeleri ve değişiklikleri kontrol edin
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Yeni Üyeler</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">{newMembers.length}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-yellow-600 font-medium">Güncellenecek Üyeler</div>
              <div className="text-2xl font-bold text-yellow-900 mt-1">{updatedMembers.length}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-600 font-medium">Hatalar</div>
              <div className="text-2xl font-bold text-red-900 mt-1">{errors.length}</div>
            </div>
          </div>

          {/* New Members */}
          {newMembers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Yeni Eklenecek Üyeler ({newMembers.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">TC</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ad Soyad</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Telefon</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Görev</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Bölge</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {newMembers.map((member, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.tc}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{member.phone}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{member.position}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{member.region}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Updated Members */}
          {updatedMembers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                Güncellenecek Üyeler ({updatedMembers.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead className="bg-yellow-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">TC</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mevcut Ad Soyad</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Yeni Ad Soyad</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mevcut Telefon</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Yeni Telefon</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Görev</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Bölge</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {updatedMembers.map((member, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.tc}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 line-through">{member.currentName || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-700">{member.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 line-through">{member.currentPhone || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-700">{member.phone}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{member.position}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{member.region}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Hatalar ({errors.length})
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700">{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Empty State */}
          {newMembers.length === 0 && updatedMembers.length === 0 && errors.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Excel dosyasında işlenecek veri bulunamadı.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || (newMembers.length === 0 && updatedMembers.length === 0)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0-2.209.896-4.209 2.343-5.657l1.414 1.414A5.98 5.98 0 006 12c0 1.657.672 3.157 1.757 4.243l1.414-1.414A5.98 5.98 0 016 12c0-1.657.672-3.157 1.757-4.243L9.171 6.343A7.962 7.962 0 0112 4c2.209 0 4.209.896 5.657 2.343l1.414-1.414A5.98 5.98 0 0012 6c-1.657 0-3.157.672-4.243 1.757L6.343 9.171A7.962 7.962 0 014 12c0 2.209.896 4.209 2.343 5.657l-1.414 1.414A5.98 5.98 0 006 12c0-1.657.672-3.157 1.757-4.243L9.171 6.343z"></path>
                </svg>
                İşleniyor...
              </>
            ) : (
              'İçe Aktar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelImportPreview;

