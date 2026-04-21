import Conf from 'conf';

/** Persisted CLI preferences (API key stored locally; never commit). */
export interface WingbitsCliConfig {
  /** Wingbits Customer API key */
  apiKey?: string;
}

export const configStore = new Conf<WingbitsCliConfig>({
  projectName: 'wingbits',
});
