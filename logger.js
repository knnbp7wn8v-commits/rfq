'use strict';

/**
 * Egységes szerveroldali naplózás. Korábban az app.js közel 20 helyen
 * hívott közvetlenül console.log()-ot/console.error()-t, egymástól eltérő
 * formátumban. Ez a modul egyetlen belépési pontot ad: a naplózás formátuma
 * (időbélyeg, szint) és célja (jelenleg stdout/stderr, később akár fájlba
 * vagy külső naplózó szolgáltatásba írás) innentől egyetlen helyen
 * módosítható, nem szórtan az egész kódbázisban.
 *
 * Lásd: kod_atvilagitas_kliens.md - a kliensoldali Logger/console.log
 * egységesítésének szerveroldali párja.
 */

function timestamp() {
  return new Date().toISOString();
}

const logger = {
  info(...args) {
    console.log(`[INFO] ${timestamp()}`, ...args);
  },
  warn(...args) {
    console.warn(`[WARN] ${timestamp()}`, ...args);
  },
  error(...args) {
    console.error(`[ERROR] ${timestamp()}`, ...args);
  },
};

module.exports = logger;
