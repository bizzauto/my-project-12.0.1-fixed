// Manual mock for qrcode.react
const React = require('react');

const QRCodeSVG = (props) =>
  React.createElement('svg', {
    'data-testid': 'qrcode-svg',
    ...props,
  });
QRCodeSVG.displayName = 'QRCodeSVG';

module.exports = { QRCodeSVG };
