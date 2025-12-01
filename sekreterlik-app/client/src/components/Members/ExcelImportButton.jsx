import React from 'react';

const ExcelImportButton = ({ onImport }) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImport(file);
      // Reset the file input
      e.target.value = null;
    }
  };

  return (
    <label className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
      Excel'den Yükle
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </label>
  );
};

export default ExcelImportButton;