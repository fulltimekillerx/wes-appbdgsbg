import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const BarcodeScanner = ({ onScanSuccess, onScanError, onCancel }) => {

  useEffect(() => {
    let scanner;
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      facingMode: "environment"
    };

    // Delay initialization slightly to ensure the DOM element is ready
    const timer = setTimeout(() => {
      scanner = new Html5QrcodeScanner('html5-qrcode-reader', config, false);

      const customOnScanError = (errorMessage) => {
        if (errorMessage.includes("No MultiFormat Readers")) return;
        onScanError(errorMessage);
      };

      scanner.render(onScanSuccess, customOnScanError);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(error => {
          console.error("Failed to clear html5-qrcode-scanner.", error);
        });
      }
    };
  }, [onScanSuccess, onScanError]);

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    backgroundColor: '#fff',
    color: '#333',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  };

  return (
    <div style={overlayStyle}>
      <button style={closeButtonStyle} onClick={onCancel}>Close</button>
      <div id="html5-qrcode-reader" style={{ width: '90%', maxWidth: '500px' }} />
    </div>
  );
};

export default BarcodeScanner;
