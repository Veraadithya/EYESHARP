import type {
  SupportedBrowser,
  BrowserArtifactType,
  BrowserHistoryArtifact,
  BrowserDownloadArtifact,
  BrowserBookmarkArtifact,
  BrowserSearchArtifact,
} from '../../types';

export interface ParserOptions {
  caseId: string;
  browserEvidenceId: string;
  sourceEvidenceId: string;
  sourceFile: string;
  browser: SupportedBrowser;
}

export interface BrowserParseResult {
  browser: SupportedBrowser;
  artifactType: BrowserArtifactType;
  history: BrowserHistoryArtifact[];
  downloads: BrowserDownloadArtifact[];
  bookmarks: BrowserBookmarkArtifact[];
  searches: BrowserSearchArtifact[];
  parserVersion: string;
}

export interface BrowserArtifactParser {
  id: string;
  parserVersion: string;
  supportedBrowser: SupportedBrowser;
  supports(file: File, arrayBuffer?: ArrayBuffer): Promise<boolean>;
  parse(file: File, options: ParserOptions, arrayBuffer?: ArrayBuffer): Promise<BrowserParseResult>;
}

class BrowserParserRegistryImpl {
  private parsers: BrowserArtifactParser[] = [];

  register(parser: BrowserArtifactParser): void {
    this.parsers.push(parser);
  }

  getParsers(): BrowserArtifactParser[] {
    return [...this.parsers];
  }

  async findMatchingParser(
    file: File,
    preferredBrowser?: SupportedBrowser,
    arrayBuffer?: ArrayBuffer
  ): Promise<BrowserArtifactParser | undefined> {
    for (const parser of this.parsers) {
      if (preferredBrowser && preferredBrowser !== 'UNKNOWN' && parser.supportedBrowser !== preferredBrowser) {
        continue;
      }
      if (await parser.supports(file, arrayBuffer)) {
        return parser;
      }
    }

    // Fallback: try any parser regardless of preferred browser
    for (const parser of this.parsers) {
      if (await parser.supports(file, arrayBuffer)) {
        return parser;
      }
    }

    return undefined;
  }
}

export const BrowserParserRegistry = new BrowserParserRegistryImpl();
