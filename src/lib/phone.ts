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

  if (digits.length === 10) {
    internacional = `55${digits}`;
  } else if (digits.length === 11) {
    if (digits.startsWith("55")) {
      const ddd = digits.slice(2, 4);
      const resto = digits.slice(4);
      if (!resto.startsWith("9") && resto.length === 8) {
        internacional = `55${ddd}9${resto}`;
      } else {
        internacional = digits;
      }
    } else {
      const ddd = digits.slice(0, 2);
      const resto = digits.slice(2);
      if (resto.startsWith("9") && resto.length === 9) {
        internacional = `55${digits}`;
      } else if (resto.length === 8) {
        internacional = `55${ddd}9${resto}`;
      } else {
        internacional = `55${digits}`;
      }
    }
  } else if (digits.length === 12 && digits.startsWith("55")) {
    internacional = digits;
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
