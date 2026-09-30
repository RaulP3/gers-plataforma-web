// Plus Codes (Open Location Code) - librería oficial de Google.
// https://github.com/google/open-location-code - Licencia Apache 2.0.
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OpenLocationCode = factory();
  }
}(this, function() {
  var OpenLocationCode = {};
  OpenLocationCode.CODE_PRECISION_NORMAL = 10;
  OpenLocationCode.CODE_PRECISION_EXTRA = 11;
  var SEPARATOR_ = '+';
  var SEPARATOR_POSITION_ = 8;
  var PADDING_CHARACTER_ = '0';
  var CODE_ALPHABET_ = '23456789CFGHJMPQRVWX';
  var ENCODING_BASE_ = CODE_ALPHABET_.length;
  var LATITUDE_MAX_ = 90;
  var LONGITUDE_MAX_ = 180;
  var MIN_DIGIT_COUNT_ = 2;
  var MAX_DIGIT_COUNT_ = 15;
  var PAIR_CODE_LENGTH_ = 10;
  var PAIR_FIRST_PLACE_VALUE_ = Math.pow(ENCODING_BASE_, (PAIR_CODE_LENGTH_ / 2 - 1));
  var PAIR_PRECISION_ = Math.pow(ENCODING_BASE_, 3);
  var PAIR_RESOLUTIONS_ = [20.0, 1.0, .05, .0025, .000125];
  var GRID_CODE_LENGTH_ = MAX_DIGIT_COUNT_ - PAIR_CODE_LENGTH_;
  var GRID_COLUMNS_ = 4;
  var GRID_ROWS_ = 5;
  var GRID_LAT_FIRST_PLACE_VALUE_ = Math.pow(GRID_ROWS_, (GRID_CODE_LENGTH_ - 1));
  var GRID_LNG_FIRST_PLACE_VALUE_ = Math.pow(GRID_COLUMNS_, (GRID_CODE_LENGTH_ - 1));
  var FINAL_LAT_PRECISION_ = PAIR_PRECISION_ * Math.pow(GRID_ROWS_, (MAX_DIGIT_COUNT_ - PAIR_CODE_LENGTH_));
  var FINAL_LNG_PRECISION_ = PAIR_PRECISION_ * Math.pow(GRID_COLUMNS_, (MAX_DIGIT_COUNT_ - PAIR_CODE_LENGTH_));
  var MIN_TRIMMABLE_CODE_LEN_ = 6;

  OpenLocationCode.isValid = function(code) {
    if (!code || typeof code !== 'string') return false;
    if (code.indexOf(SEPARATOR_) == -1) return false;
    if (code.indexOf(SEPARATOR_) != code.lastIndexOf(SEPARATOR_)) return false;
    if (code.length == 1) return false;
    if (code.indexOf(SEPARATOR_) > SEPARATOR_POSITION_ || code.indexOf(SEPARATOR_) % 2 == 1) return false;
    if (code.indexOf(PADDING_CHARACTER_) > -1) {
      if (code.indexOf(SEPARATOR_) < SEPARATOR_POSITION_) return false;
      if (code.indexOf(PADDING_CHARACTER_) == 0) return false;
      var padMatch = code.match(new RegExp('(' + PADDING_CHARACTER_ + '+)', 'g'));
      if (padMatch.length > 1 || padMatch[0].length % 2 == 1 || padMatch[0].length > SEPARATOR_POSITION_ - 2) return false;
      if (code.charAt(code.length - 1) != SEPARATOR_) return false;
    }
    if (code.length - code.indexOf(SEPARATOR_) - 1 == 1) return false;
    code = code.replace(new RegExp('\\' + SEPARATOR_ + '+'), '').replace(new RegExp(PADDING_CHARACTER_ + '+'), '');
    for (var i = 0, len = code.length; i < len; i++) {
      var character = code.charAt(i).toUpperCase();
      if (character != SEPARATOR_ && CODE_ALPHABET_.indexOf(character) == -1) return false;
    }
    return true;
  };

  OpenLocationCode.isShort = function(code) {
    if (!OpenLocationCode.isValid(code)) return false;
    if (code.indexOf(SEPARATOR_) >= 0 && code.indexOf(SEPARATOR_) < SEPARATOR_POSITION_) return true;
    return false;
  };

  OpenLocationCode.isFull = function(code) {
    if (!OpenLocationCode.isValid(code)) return false;
    if (OpenLocationCode.isShort(code)) return false;
    var firstLatValue = CODE_ALPHABET_.indexOf(code.charAt(0).toUpperCase()) * ENCODING_BASE_;
    if (firstLatValue >= LATITUDE_MAX_ * 2) return false;
    if (code.length > 1) {
      var firstLngValue = CODE_ALPHABET_.indexOf(code.charAt(1).toUpperCase()) * ENCODING_BASE_;
      if (firstLngValue >= LONGITUDE_MAX_ * 2) return false;
    }
    return true;
  };

  var clipLatitude = function(latitude) { return Math.min(90, Math.max(-90, latitude)); };
  var normalizeLongitude = function(longitude) {
    while (longitude < -180) longitude += 360;
    while (longitude >= 180) longitude -= 360;
    return longitude;
  };

  var locationToIntegers = function(latitude, longitude) {
    var latVal = Math.floor(latitude * FINAL_LAT_PRECISION_);
    latVal += LATITUDE_MAX_ * FINAL_LAT_PRECISION_;
    if (latVal < 0) latVal = 0;
    else if (latVal >= 2 * LATITUDE_MAX_ * FINAL_LAT_PRECISION_) latVal = 2 * LATITUDE_MAX_ * FINAL_LAT_PRECISION_ - 1;
    var lngVal = Math.floor(longitude * FINAL_LNG_PRECISION_);
    lngVal += LONGITUDE_MAX_ * FINAL_LNG_PRECISION_;
    if (lngVal < 0) lngVal = (lngVal % (2 * LONGITUDE_MAX_ * FINAL_LNG_PRECISION_)) + 2 * LONGITUDE_MAX_ * FINAL_LNG_PRECISION_;
    else if (lngVal >= 2 * LONGITUDE_MAX_ * FINAL_LNG_PRECISION_) lngVal = lngVal % (2 * LONGITUDE_MAX_ * FINAL_LNG_PRECISION_);
    return [latVal, lngVal];
  };

  var encodeIntegers = function(latInt, lngInt, codeLength) {
    if (typeof codeLength == 'undefined') codeLength = OpenLocationCode.CODE_PRECISION_NORMAL;
    else codeLength = Math.min(MAX_DIGIT_COUNT_, Number(codeLength));
    if (isNaN(latInt) || isNaN(lngInt) || isNaN(codeLength)) throw new Error('ValueError: Parameters are not numbers');
    if (codeLength < MIN_DIGIT_COUNT_ || (codeLength < PAIR_CODE_LENGTH_ && codeLength % 2 == 1)) throw new Error('IllegalArgumentException: Invalid Open Location Code length');
    var code = new Array(MAX_DIGIT_COUNT_ + 1);
    code[SEPARATOR_POSITION_] = SEPARATOR_;
    if (codeLength > PAIR_CODE_LENGTH_) {
      for (var gi = MAX_DIGIT_COUNT_ - PAIR_CODE_LENGTH_; gi >= 1; gi--) {
        var latDigit = latInt % GRID_ROWS_;
        var lngDigit = lngInt % GRID_COLUMNS_;
        var ndx = latDigit * GRID_COLUMNS_ + lngDigit;
        code[SEPARATOR_POSITION_ + 2 + gi] = CODE_ALPHABET_.charAt(ndx);
        latInt = Math.floor(latInt / GRID_ROWS_);
        lngInt = Math.floor(lngInt / GRID_COLUMNS_);
      }
    } else {
      latInt = Math.floor(latInt / Math.pow(GRID_ROWS_, GRID_CODE_LENGTH_));
      lngInt = Math.floor(lngInt / Math.pow(GRID_COLUMNS_, GRID_CODE_LENGTH_));
    }
    code[SEPARATOR_POSITION_ + 1] = CODE_ALPHABET_.charAt(latInt % ENCODING_BASE_);
    code[SEPARATOR_POSITION_ + 2] = CODE_ALPHABET_.charAt(lngInt % ENCODING_BASE_);
    latInt = Math.floor(latInt / ENCODING_BASE_);
    lngInt = Math.floor(lngInt / ENCODING_BASE_);
    for (var i = PAIR_CODE_LENGTH_ / 2 + 1; i >= 0; i -= 2) {
      code[i] = CODE_ALPHABET_.charAt(latInt % ENCODING_BASE_);
      code[i + 1] = CODE_ALPHABET_.charAt(lngInt % ENCODING_BASE_);
      latInt = Math.floor(latInt / ENCODING_BASE_);
      lngInt = Math.floor(lngInt / ENCODING_BASE_);
    }
    if (codeLength >= SEPARATOR_POSITION_) return code.slice(0, codeLength + 1).join('');
    return code.slice(0, codeLength).join('') + Array(SEPARATOR_POSITION_ - codeLength + 1).join(PADDING_CHARACTER_) + SEPARATOR_;
  };

  OpenLocationCode.encode = function(latitude, longitude, codeLength) {
    latitude = Number(latitude);
    longitude = Number(longitude);
    var ints = locationToIntegers(latitude, longitude);
    return encodeIntegers(ints[0], ints[1], codeLength);
  };

  OpenLocationCode.decode = function(code) {
    if (!OpenLocationCode.isFull(code)) throw new Error('IllegalArgumentException: Passed Plus Code is not a valid full code: ' + code);
    code = code.replace('+', '').replace(/0/g, '').toLocaleUpperCase('en-US');
    var normalLat = -LATITUDE_MAX_ * PAIR_PRECISION_;
    var normalLng = -LONGITUDE_MAX_ * PAIR_PRECISION_;
    var gridLat = 0;
    var gridLng = 0;
    var digits = Math.min(code.length, PAIR_CODE_LENGTH_);
    var pv = PAIR_FIRST_PLACE_VALUE_;
    for (var i = 0; i < digits; i += 2) {
      normalLat += CODE_ALPHABET_.indexOf(code.charAt(i)) * pv;
      normalLng += CODE_ALPHABET_.indexOf(code.charAt(i + 1)) * pv;
      if (i < digits - 2) pv /= ENCODING_BASE_;
    }
    var latPrecision = pv / PAIR_PRECISION_;
    var lngPrecision = pv / PAIR_PRECISION_;
    if (code.length > PAIR_CODE_LENGTH_) {
      var rowpv = GRID_LAT_FIRST_PLACE_VALUE_;
      var colpv = GRID_LNG_FIRST_PLACE_VALUE_;
      digits = Math.min(code.length, MAX_DIGIT_COUNT_);
      for (var j = PAIR_CODE_LENGTH_; j < digits; j++) {
        var digitVal = CODE_ALPHABET_.indexOf(code.charAt(j));
        var row = Math.floor(digitVal / GRID_COLUMNS_);
        var col = digitVal % GRID_COLUMNS_;
        gridLat += row * rowpv;
        gridLng += col * colpv;
        if (j < digits - 1) { rowpv /= GRID_ROWS_; colpv /= GRID_COLUMNS_; }
      }
      latPrecision = rowpv / FINAL_LAT_PRECISION_;
      lngPrecision = colpv / FINAL_LNG_PRECISION_;
    }
    var lat = normalLat / PAIR_PRECISION_ + gridLat / FINAL_LAT_PRECISION_;
    var lng = normalLng / PAIR_PRECISION_ + gridLng / FINAL_LNG_PRECISION_;
    return new CodeArea(lat, lng, lat + latPrecision, lng + lngPrecision, Math.min(code.length, MAX_DIGIT_COUNT_));
  };

  OpenLocationCode.recoverNearest = function(shortCode, referenceLatitude, referenceLongitude) {
    if (!OpenLocationCode.isShort(shortCode)) {
      if (OpenLocationCode.isFull(shortCode)) return shortCode.toUpperCase();
      else throw new Error('ValueError: Passed short code is not valid: ' + shortCode);
    }
    referenceLatitude = Number(referenceLatitude);
    referenceLongitude = Number(referenceLongitude);
    if (isNaN(referenceLatitude) || isNaN(referenceLongitude)) throw new Error('ValueError: Reference position are not numbers');
    referenceLatitude = clipLatitude(referenceLatitude);
    referenceLongitude = normalizeLongitude(referenceLongitude);
    shortCode = shortCode.toUpperCase();
    var paddingLength = SEPARATOR_POSITION_ - shortCode.indexOf(SEPARATOR_);
    var resolution = Math.pow(20, 2 - (paddingLength / 2));
    var halfResolution = resolution / 2.0;
    var codeArea = OpenLocationCode.decode(
      OpenLocationCode.encode(referenceLatitude, referenceLongitude).substr(0, paddingLength) + shortCode);
    if (referenceLatitude + halfResolution < codeArea.latitudeCenter && codeArea.latitudeCenter - resolution >= -LATITUDE_MAX_) {
      codeArea.latitudeCenter -= resolution;
    } else if (referenceLatitude - halfResolution > codeArea.latitudeCenter && codeArea.latitudeCenter + resolution <= LATITUDE_MAX_) {
      codeArea.latitudeCenter += resolution;
    }
    if (referenceLongitude + halfResolution < codeArea.longitudeCenter) {
      codeArea.longitudeCenter -= resolution;
    } else if (referenceLongitude - halfResolution > codeArea.longitudeCenter) {
      codeArea.longitudeCenter += resolution;
    }
    return OpenLocationCode.encode(codeArea.latitudeCenter, codeArea.longitudeCenter, codeArea.codeLength);
  };

  OpenLocationCode.shorten = function(code, latitude, longitude) {
    if (!OpenLocationCode.isFull(code)) throw new Error('ValueError: Passed code is not valid and full: ' + code);
    if (code.indexOf(PADDING_CHARACTER_) != -1) throw new Error('ValueError: Cannot shorten padded codes: ' + code);
    code = code.toUpperCase();
    var codeArea = OpenLocationCode.decode(code);
    if (codeArea.codeLength < MIN_TRIMMABLE_CODE_LEN_) throw new Error('ValueError: Code length must be at least ' + MIN_TRIMMABLE_CODE_LEN_);
    latitude = Number(latitude);
    longitude = Number(longitude);
    if (isNaN(latitude) || isNaN(longitude)) throw new Error('ValueError: Reference position are not numbers');
    latitude = clipLatitude(latitude);
    longitude = normalizeLongitude(longitude);
    var range = Math.max(Math.abs(codeArea.latitudeCenter - latitude), Math.abs(codeArea.longitudeCenter - longitude));
    for (var i = PAIR_RESOLUTIONS_.length - 2; i >= 1; i--) {
      if (range < (PAIR_RESOLUTIONS_[i] * 0.3)) return code.substring((i + 1) * 2);
    }
    return code;
  };

  var CodeArea = OpenLocationCode.CodeArea = function(latitudeLo, longitudeLo, latitudeHi, longitudeHi, codeLength) {
    return new OpenLocationCode.CodeArea.fn.Init(latitudeLo, longitudeLo, latitudeHi, longitudeHi, codeLength);
  };
  CodeArea.fn = CodeArea.prototype = {
    Init: function(latitudeLo, longitudeLo, latitudeHi, longitudeHi, codeLength) {
      this.latitudeLo = latitudeLo;
      this.longitudeLo = longitudeLo;
      this.latitudeHi = latitudeHi;
      this.longitudeHi = longitudeHi;
      this.codeLength = codeLength;
      this.latitudeCenter = Math.min(latitudeLo + (latitudeHi - latitudeLo) / 2, LATITUDE_MAX_);
      this.longitudeCenter = Math.min(longitudeLo + (longitudeHi - longitudeLo) / 2, LONGITUDE_MAX_);
    }
  };
  CodeArea.fn.Init.prototype = CodeArea.fn;
  return OpenLocationCode;
}));