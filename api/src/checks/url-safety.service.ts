import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

@Injectable()
export class UrlSafetyService {
  validateSyntax(rawUrl: string): URL {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('URL is invalid');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException('Only http:// and https:// URLs are allowed');
    }
    if (url.username || url.password) {
      throw new BadRequestException('Credentials in URLs are not allowed');
    }
    if (!url.hostname) throw new BadRequestException('URL must include a hostname');
    return url;
  }

  async assertSafePublicUrl(rawUrl: string): Promise<URL> {
    const url = this.validateSyntax(rawUrl);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    if (host === 'localhost' || host.endsWith('.localhost')) {
      throw new BadRequestException('Local addresses cannot be monitored');
    }

    const literalVersion = isIP(host);
    if (literalVersion && this.isBlockedIp(host)) {
      throw new BadRequestException('Private, loopback, link-local and reserved IPs are blocked');
    }

    if (!literalVersion) {
      let addresses: { address: string; family: number }[];
      try {
        addresses = await lookup(host, { all: true, verbatim: true });
      } catch {
        throw new BadRequestException('Hostname could not be resolved');
      }
      if (!addresses.length || addresses.some((item) => this.isBlockedIp(item.address))) {
        throw new BadRequestException('Hostname resolves to a blocked network address');
      }
    }

    return url;
  }

  isBlockedIp(address: string): boolean {
    const normalized = address.toLowerCase();
    if (normalized === '::1' || normalized === '::' || normalized === '0.0.0.0') return true;

    if (normalized.startsWith('::ffff:')) {
      return this.isBlockedIp(normalized.slice(7));
    }

    if (normalized.includes(':')) {
      return (
        normalized.startsWith('fc') || normalized.startsWith('fd') ||
        normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
        normalized.startsWith('fea') || normalized.startsWith('feb') ||
        normalized.startsWith('2001:db8:')
      );
    }

    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true;
    const [a, b] = parts;
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && parts[2] === 100) ||
      (a === 203 && b === 0 && parts[2] === 113) ||
      a >= 224
    );
  }
}
