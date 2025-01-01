export const testConnection = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/health`);
      if (!response.ok) throw new Error('API health check failed');
      return await response.json();
    } catch (error) {
      console.error('API Connection Error:', error);
      throw error;
    }
  };