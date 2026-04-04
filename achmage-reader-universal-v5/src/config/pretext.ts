import type {OutputMode} from '../core/content';

export type PretextConfig = {
  enabled: boolean;
  phase: 1 | 2 | 3;
  outputs: Record<OutputMode, boolean>;
  qa: {
    enabled: boolean;
    failOnError: boolean;
    mobileWidth: number;
    tabletWidth: number;
    desktopWidth: number;
  };
  targets: {
    header: boolean;
    thesis: boolean;
    quote: boolean;
    evidenceGrid: boolean;
    axisTable: boolean;
    sectionCover: boolean;
    newsletterCover: boolean;
    wrapFigure: boolean;
  };
};

export const pretextConfig = {
  enabled: true,
  phase: 3,
  outputs: {
    reader: true,
    stage: true,
    newsletter: true,
  },
  qa: {
    enabled: true,
    failOnError: false,
    mobileWidth: 390,
    tabletWidth: 768,
    desktopWidth: 1280,
  },
  targets: {
    header: true,
    thesis: true,
    quote: true,
    evidenceGrid: true,
    axisTable: true,
    sectionCover: true,
    newsletterCover: true,
    wrapFigure: true,
  },
} satisfies PretextConfig;
