type NormalizacaoTelefoneWhatsapp = {
  raw: string;
  digits: string;
  e164: string | null;
  waNumber: string | null;
  valido: boolean;
  motivoErro: string | null;
};

function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

export function mascararTelefoneParaLog(valor: string) {
  const digitos = somenteDigitos(valor);
  if (!digitos) {
    return "(vazio)";
  }

  if (digitos.length <= 4) {
    return `****${digitos}`;
  }

  return `${digitos.slice(0, 2)}****${digitos.slice(-4)}`;
}

export function normalizarTelefoneParaWhatsapp(valor: string): NormalizacaoTelefoneWhatsapp {
  const raw = valor.trim();
  if (!raw) {
    return {
      raw,
      digits: "",
      e164: null,
      waNumber: null,
      valido: false,
      motivoErro: "Telefone vazio.",
    };
  }

  let digits = somenteDigitos(raw);
  if (!digits) {
    return {
      raw,
      digits,
      e164: null,
      waNumber: null,
      valido: false,
      motivoErro: "Telefone sem digitos numericos.",
    };
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0") && digits.length >= 11 && digits.length <= 12) {
    digits = digits.slice(1);
  }

  let internacional = digits;

  if (digits.length === 10 || digits.length === 11) {
    internacional = `55${digits}`;
  }

  if (internacional.length < 12 || internacional.length > 15) {
    return {
      raw,
      digits,
      e164: null,
      waNumber: null,
      valido: false,
      motivoErro: "Telefone fora do padrao E.164.",
    };
  }

  return {
    raw,
    digits,
    e164: `+${internacional}`,
    waNumber: internacional,
    valido: true,
    motivoErro: null,
  };
}
