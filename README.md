# Documentación del Algoritmo de Cifrado por Bloques

## Descripción General

Este documento proporciona una explicación detallada de un algoritmo personalizado de cifrado por bloques implementado en JavaScript. El algoritmo utiliza una combinación de operaciones de sustitución, transposición y XOR para cifrar y descifrar datos de texto.

## Componentes Principales

### Clase BlockCipher

La clase principal que implementa el algoritmo de cifrado por bloques con las siguientes propiedades:

```javascript
constructor(secretKey, iv = null) {
  this.numRounds = 32;         // Número de rondas de cifrado/descifrado
  this.blockSize = 4;          // Tamaño de cada bloque en caracteres
  this.alphabet = 'abcdefghijklmnopqrstuvwxyz'; // Conjunto de caracteres usado para sustitución
  this.defaultKey = 'defaultsecretkey';
  this.secretKey = secretKey || this.defaultKey;
}
```

- `numRounds`: Define el número de rondas de cifrado y descifrado (por defecto: 32)
- `blockSize`: Establece el tamaño de cada bloque en caracteres (por defecto: 4)
- `alphabet`: Conjunto de caracteres utilizados para la operación de sustitución (alfabeto inglés en minúsculas)
- `secretKey`: Clave utilizada para generar las claves de ronda y el vector de inicialización

### Clase LCGGenerator

Una clase auxiliar que implementa un Generador Congruencial Lineal (LCG) para la generación de números pseudoaleatorios:

```javascript
static calculateXi(xi, a, c, m) {
  return (a * xi + c) % m;
}

static calculateRi(xi, m) {
  return xi / (m - 1);
}

static calculateNi(minValue, maxValue, ri) {
  return minValue + (maxValue - minValue) * ri;
}
```

- Genera secuencias utilizando la fórmula: X(i+1) = (a \* X(i) + c) mod m
- Se utiliza para crear claves de ronda y vectores de inicialización
- Proporciona métodos para calcular valores normalizados entre un rango específico

## Proceso de Cifrado

### Generación de Claves (`generateKeys`)

Convierte una clave secreta en claves de ronda y un vector de inicialización (IV):

```javascript
generateKeys(secretKey = this.secretKey) {
  let seed = 0;
  for (let i = 0; i < secretKey.length; i++) {
    seed += secretKey.charCodeAt(i);
  }

  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);
  const iterations = this.numRounds * 8 + this.blockSize;

  const { niArray } = this.calculateLCGTable(seed, a, c, m, iterations, 0, 1);

  const iv = niArray.slice(0, this.blockSize).map((val) => Math.floor(val * 26));
  const keys = [];
  for (let i = 0; i < this.numRounds; i++) {
    const key = niArray.slice(this.blockSize + i * 8, this.blockSize + (i + 1) * 8);
    keys.push(key);
  }

  return { keys, iv, lcgParams: { seed, a, c, m } };
}
```

1. Crea una semilla sumando los códigos de caracteres de la clave secreta
2. Define parámetros para el generador LCG (a, c, m) que determinarán la calidad de los números aleatorios
3. Utiliza el LCG para generar una secuencia de valores pseudoaleatorios
4. Los primeros valores (`blockSize`) se convierten en el IV, mapeándolos al rango 0-25 (índices del alfabeto)
5. Los valores restantes se agrupan en claves de ronda (8 valores por ronda)

### Procesamiento de Bloques

Cada bloque de texto plano pasa por las siguientes operaciones:

#### 1. XOR Inicial (`xorBlocks`)

```javascript
xorBlocks(block1, block2, isEncrypt = true) {
  let result = '';
  for (let i = 0; i < block1.length; i++) {
    const char1 = block1[i].toLowerCase();
    const char2 = i < block2.length ? block2[i].toLowerCase() : 'a';
    const index1 = this.alphabet.indexOf(char1);
    const index2 = this.alphabet.indexOf(char2);

    if (index1 !== -1 && index2 !== -1) {
      let newIndex;
      if (isEncrypt) {
        newIndex = (index1 + index2) % 26;
      } else {
        newIndex = (index1 - index2 + 26) % 26;
      }
      result += this.alphabet[newIndex];
    } else {
      result += char1;
    }
  }
  return result;
}
```

- El primer bloque se combina mediante XOR con el IV
- Los bloques subsiguientes se combinan mediante XOR con el bloque de texto cifrado anterior (modo Cipher Block Chaining)
- La operación XOR funciona a nivel de índices de caracteres en el alfabeto:
  - Para el cifrado: (índice1 + índice2) % 26
  - Para el descifrado: (índice1 - índice2 + 26) % 26

#### 2. Múltiples Rondas de Operaciones:

##### Sustitución (`substitute`)

```javascript
substitute(block, key, round, iv) {
  let result = '';
  const operations = [];
  for (let i = 0; i < block.length; i++) {
    const char = block[i];
    const index = this.alphabet.indexOf(char.toLowerCase());
    if (index !== -1) {
      const shift = Math.floor(key[i % key.length] * 25) + 1;
      const ivShift = iv[i % iv.length];
      const newIndex = (index + shift + ivShift + round) % 26;

      operations.push(`(${index} + ${shift} + ${ivShift} + ${round}) % 26 = ${newIndex}`);
      result += this.alphabet[newIndex];
    } else {
      operations.push(`${char} (No modificado)`);
      result += char;
    }
  }
  return { result, operations };
}
```

- Cada carácter se desplaza basándose en:
  - La clave de ronda (valores aleatorios generados por LCG)
  - El vector de inicialización
  - El número de ronda actual
- El desplazamiento total se calcula como: (índice + desplazamientoClave + desplazamientoIV + ronda) % 26
- Se mantiene un registro de todas las operaciones para fines de depuración y educativos

##### Transposición (`transpose`)

```javascript
transpose(block) {
  return block.split('').reverse().join('');
}
```

- Los caracteres en el bloque se invierten de orden
- Esta operación simple pero efectiva contribuye a la difusión de patrones

### Flujo de Cifrado (`encrypt`)

```javascript
encrypt(plainText, customKey = null) {
  const cleanText = plainText
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);

  const usedKey = customKey || this.secretKey;
  const { keys, iv, lcgParams } = this.generateKeys(usedKey);

  const blocks = [];
  for (let i = 0; i < cleanText.length; i += this.blockSize) {
    blocks.push(cleanText.substring(i, i + this.blockSize));
  }

  if (blocks.length > 0 && blocks[blocks.length - 1].length < this.blockSize) {
    blocks[blocks.length - 1] = blocks[blocks.length - 1].padEnd(this.blockSize, 'x');
  }

  const encryptedResults = [];
  const encryptedBlocks = [];

  for (let i = 0; i < blocks.length; i++) {
    const previousCiphertext = i > 0 ? encryptedBlocks[i - 1] : null;
    const result = this.encryptBlock(blocks[i], keys, iv, previousCiphertext);

    encryptedResults.push(result);
    encryptedBlocks.push(result.result);
  }

  // ... código para generar metadatos ...

  return {
    original: cleanText,
    encrypted: encryptedBlocks.join(''),
    numBlocks: blocks.length,
    blocks: blocks,
    encryptedBlocks: encryptedBlocks,
    // ... más metadatos ...
  };
}
```

1. Limpia y normaliza el texto de entrada (a minúsculas, elimina caracteres no alfanuméricos)
2. Genera las claves de ronda y el vector de inicialización a partir de la clave secreta
3. Divide el texto en bloques del tamaño especificado (`blockSize`)
4. Rellena el último bloque si es necesario con el carácter 'x'
5. Procesa cada bloque a través del algoritmo de cifrado:
   - Aplica XOR con el bloque cifrado anterior o el IV
   - Ejecuta múltiples rondas de sustitución y transposición
6. Devuelve los bloques cifrados concatenados y metadatos detallados sobre el proceso

## Proceso de Descifrado

### Flujo de Descifrado (`decrypt`)

```javascript
decrypt(cipherText, secretKey = this.secretKey) {
  const { keys, iv, lcgParams } = this.generateKeys(secretKey);

  const blocks = [];
  for (let i = 0; i < cipherText.length; i += this.blockSize) {
    blocks.push(cipherText.substring(i, i + this.blockSize));
  }

  const decryptedResults = [];
  const decryptedBlocks = [];

  for (let i = 0; i < blocks.length; i++) {
    const originalCiphertextBlocks = [...blocks];
    const previousCiphertext = i > 0 ? originalCiphertextBlocks[i - 1] : null;
    const result = this.decryptBlock(blocks[i], keys, iv, previousCiphertext);
    decryptedResults.push(result);
    decryptedBlocks.push(result.result);
  }

  // ... código para generar metadatos ...

  let decryptedText = decryptedBlocks.join('');
  decryptedText = decryptedText.replace(/x+$/, ''); // Elimina el relleno

  return {
    encrypted: cipherText,
    decrypted: decryptedText,
    // ... más metadatos ...
  };
}
```

1. Genera las mismas claves de ronda y vector de inicialización utilizando la clave secreta
2. Divide el texto cifrado en bloques
3. Aplica las operaciones inversas en orden inverso:

#### 1. Múltiples Rondas (en orden inverso) de:

##### Transposición Inversa (`transposeInverse`)

```javascript
transposeInverse(block) {
  return block.split('').reverse().join('');
}
```

- Invierte el orden de los caracteres
- En este caso, la operación es idéntica a `transpose` ya que invertir dos veces devuelve el orden original

##### Sustitución Inversa (`substituteInverse`)

```javascript
substituteInverse(block, key, round, iv) {
  let result = '';
  const operations = [];
  for (let i = 0; i < block.length; i++) {
    const char = block[i];
    const index = this.alphabet.indexOf(char.toLowerCase());

    if (index !== -1) {
      const shift = Math.floor(key[i % key.length] * 25) + 1;
      const ivShift = iv[i % iv.length];
      let newIndex = (index - shift - ivShift - round) % 26;
      while (newIndex < 0) {
        newIndex += 26;
      }

      operations.push(
        `((${index} - ${shift} - ${ivShift} - ${round}) % 26 + 26) % 26 = ${newIndex}`,
      );
      result += this.alphabet[newIndex];
    } else {
      operations.push(`${char} (No modificado)`);
      result += char;
    }
  }
  return { result, operations };
}
```

- Aplica el desplazamiento inverso basado en las mismas claves
- La fórmula inversa es: ((índice - desplazamientoClave - desplazamientoIV - ronda) % 26 + 26) % 26
- El "+ 26" y el módulo adicional aseguran que el resultado sea siempre positivo

#### 2. XOR Final

- Combina con el bloque de texto cifrado anterior o el IV utilizando la operación XOR inversa
- Elimina el relleno ('x') del resultado final

## Métodos de Cifrado y Descifrado de Bloques

### encryptBlock

```javascript
encryptBlock(block, keys, iv, previousCiphertext = null) {
  let currentBlock = block;
  const steps = [];
  let xorResult = '';

  if (previousCiphertext) {
    currentBlock = this.xorBlocks(currentBlock, previousCiphertext, true);
    xorResult = currentBlock;
  } else {
    const ivAsText = iv.map((val) => this.alphabet[val % 26]).join('');
    currentBlock = this.xorBlocks(currentBlock, ivAsText, true);
    xorResult = currentBlock;
  }

  for (let round = 0; round < this.numRounds; round++) {
    const beforeSub = currentBlock;

    const substitutionResult = this.substitute(currentBlock, keys[round], round, iv);
    currentBlock = substitutionResult.result;

    const afterSub = currentBlock;

    currentBlock = this.transpose(currentBlock);

    steps.push({
      round: round + 1,
      beforeSub,
      afterSub,
      result: currentBlock,
      substitutionOperations: substitutionResult.operations,
      xorResult,
      key: keys[round].map((v) => v.toFixed(4)),
    });
  }

  return { result: currentBlock, steps };
}
```

Este método encripta un solo bloque de texto siguiendo estos pasos:

1. Realiza un XOR inicial con el bloque cifrado anterior (o el IV para el primer bloque)
2. Para cada una de las rondas (32 por defecto):
   - Aplica la operación de sustitución utilizando la clave de ronda actual
   - Aplica la operación de transposición (inversión de caracteres)
3. Mantiene un registro detallado de todas las transformaciones para fines de depuración
4. Devuelve el bloque cifrado final y los pasos intermedios

### decryptBlock

```javascript
decryptBlock(block, keys, iv, previousCiphertext = null) {
  let currentBlock = block;
  const steps = [];

  const originalBlock = currentBlock;

  for (let round = this.numRounds - 1; round >= 0; round--) {
    const beforeTransInv = currentBlock;

    currentBlock = this.transposeInverse(currentBlock);

    const afterTransInv = currentBlock;

    const substitutionResult = this.substituteInverse(currentBlock, keys[round], round, iv);
    currentBlock = substitutionResult.result;

    steps.push({
      round: round + 1,
      beforeTransInv,
      afterTransInv,
      result: currentBlock,
      substitutionOperations: substitutionResult.operations,
    });
  }

  if (previousCiphertext) {
    currentBlock = this.xorBlocks(currentBlock, previousCiphertext, false);
  } else {
    const ivAsText = iv.map((val) => this.alphabet[val % 26]).join('');
    currentBlock = this.xorBlocks(currentBlock, ivAsText, false);
  }

  return { result: currentBlock, steps };
}
```

Este método descifra un solo bloque de texto cifrado:

1. Para cada ronda, en orden inverso (desde numRounds-1 hasta 0):
   - Aplica la transposición inversa (que es igual a la transposición normal)
   - Aplica la sustitución inversa utilizando la misma clave de ronda
2. Finalmente, realiza la operación XOR inversa con el bloque cifrado anterior (o el IV)
3. Mantiene un registro detallado de todas las transformaciones
4. Devuelve el bloque descifrado y los pasos intermedios

## Generación de Números Pseudoaleatorios

El método `calculateLCGTable` implementa el algoritmo LCG para generar secuencias de números pseudoaleatorios:

```javascript
calculateLCGTable(seed, a, c, m, iterations, minValue, maxValue) {
  let Xi = seed;
  const table = [];
  const niArray = [];
  for (let i = 0; i < iterations; i++) {
    Xi = (a * Xi + c) % m;
    const ri = Xi / m;
    const ni = minValue + ri * (maxValue - minValue);
    table.push([i, Xi, ri, ni]);
    niArray.push(ni);
  }
  return { table, niArray };
}
```

- `seed`: Valor inicial derivado de la clave secreta
- `a`, `c`, `m`: Parámetros que determinan la calidad de la secuencia aleatoria
- `iterations`: Número de valores aleatorios a generar
- `minValue`, `maxValue`: Rango para normalizar los valores generados
- El método devuelve tanto la tabla completa (con valores intermedios) como un array de valores normalizados

## Gráfico de funcionamiento

El siguiente diagrama muestra el flujo general del algoritmo de cifrado por bloques, para la cadena de texto "hola":

![Diagrama de Cifrado y Descifrado por Bloques](diagrams/cipher_decipher.png)

En caso de que no se visualice la imagen, se puede encontrar en el siguiente enlace: <https://excalidraw.com/#json=sotCNtd18RjQI_zCT_F2B,O02fldVNZsx4cevCxYmkVA>
También puede usar el archivo [.excalidraw adjunto](diagrams/cipher_decipher.excalidraw).
