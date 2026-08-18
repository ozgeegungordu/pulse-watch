import { UrlSafetyService } from './url-safety.service';

describe('UrlSafetyService', () => {
  const service = new UrlSafetyService();

  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fc00::1',
    'fe80::1',
  ])('blocks %s', (address) => expect(service.isBlockedIp(address)).toBe(true));

  it.each(['1.1.1.1', '8.8.8.8'])('allows public IP %s', (address) => {
    expect(service.isBlockedIp(address)).toBe(false);
  });

  it.each(['file:///etc/passwd', 'ftp://example.com/file', 'javascript:alert(1)'])(
    'rejects unsafe protocol %s',
    (url) => expect(() => service.validateSyntax(url)).toThrow(),
  );

  it('rejects credentials embedded in a URL', () => {
    expect(() => service.validateSyntax('https://user:pass@example.com')).toThrow();
  });
});
