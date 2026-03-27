/**
 * Barrel index — All local question banks & exam configs
 */
import { BANCO_EO_DEMO } from './banco_eo_demo';
import { BANCO_EO_PREMIUM_P1 } from './banco_eo_premium_p1';
import { BANCO_EO_PREMIUM_P2 } from './banco_eo_premium_p2';
import { BANCO_EO_EXAM2_P1 } from './banco_eo_exam2_p1';
import { BANCO_EO_EXAM2_P2 } from './banco_eo_exam2_p2';
import { BANCO_EESTP_PREMIUM_P1 } from './banco_eestp_premium_p1';
import { BANCO_EESTP_PREMIUM_P2 } from './banco_eestp_premium_p2';
import { BANCO_EESTP_EXAM2_P1 } from './banco_eestp_exam2_p1';
import { BANCO_EESTP_EXAM2_P2 } from './banco_eestp_exam2_p2';

export { BANCO_EO_DEMO };

/** 100 preguntas PRO — Escuela de Oficiales (Examen 1) */
export const BANCO_EO_PREMIUM = [...BANCO_EO_PREMIUM_P1, ...BANCO_EO_PREMIUM_P2];

/** 100 preguntas PRO — Escuela de Oficiales (Examen 2) */
export const BANCO_EO_EXAM2 = [...BANCO_EO_EXAM2_P1, ...BANCO_EO_EXAM2_P2];

/** 100 preguntas PRO — Escuela Técnica / Suboficiales (Examen 1) */
export const BANCO_EESTP_PREMIUM = [...BANCO_EESTP_PREMIUM_P1, ...BANCO_EESTP_PREMIUM_P2];

/** 100 preguntas PRO — Escuela Técnica / Suboficiales (Examen 2) */
export const BANCO_EESTP_EXAM2 = [...BANCO_EESTP_EXAM2_P1, ...BANCO_EESTP_EXAM2_P2];
