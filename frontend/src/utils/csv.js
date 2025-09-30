// A utility function to convert JSON data to CSV format and trigger a download.
export const downloadCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    console.error("No data available to download.");
    return;
  }

  // Flatten nested objects for CSV
  const flattenedData = data.map(row => {
    const flatRow = {};
    for (const key in row) {
      if (typeof row[key] === 'object' && row[key] !== null) {
        for (const subKey in row[key]) {
          if (typeof row[key][subKey] !== 'object' || row[key][subKey] === null) {
             flatRow[`${key}_${subKey}`] = row[key][subKey];
          }
        }
      } else {
        flatRow[key] = row[key];
      }
    }
    return flatRow;
  });

  const header = Object.keys(flattenedData[0]);
  const csvRows = [
    header.join(','),
    ...flattenedData.map(row =>
      header
        .map(fieldName => JSON.stringify(row[fieldName], (key, value) => value === null ? '' : value))
        .join(',')
    )
  ];

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

