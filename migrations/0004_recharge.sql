-- Receiving configuration defaults off; owner must configure and verify the real QR/address.
INSERT OR IGNORE INTO system_settings(key,value) VALUES('payment_usdt_trc20','{"enabled":false,"autoApproval":false,"address":"","qrAssetId":null,"instructions":"","qrConfirmed":false,"revision":0}');
