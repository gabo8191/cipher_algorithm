class BlockCipher {
  constructor(secretKey, iv = null) {
    this.numRounds = 32;
    this.blockSize = 4;
    this.alphabet = 'abcdefghijklmnopqrstuvwxyz';
    this.defaultKey = 'defaultsecretkey';
    this.secretKey = secretKey || this.defaultKey;
  }

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

    const iv = niArray
      .slice(0, this.blockSize)
      .map((val) => Math.floor(val * 26));
    const keys = [];
    for (let i = 0; i < this.numRounds; i++) {
      const key = niArray.slice(
        this.blockSize + i * 8,
        this.blockSize + (i + 1) * 8,
      );
      keys.push(key);
    }

    return { keys, iv, lcgParams: { seed, a, c, m } };
  }

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

        operations.push(
          `(${index} + ${shift} + ${ivShift} + ${round}) % 26 = ${newIndex}`,
        );
        result += this.alphabet[newIndex];
      } else {
        operations.push(`${char} (No modificado)`);
        result += char;
      }
    }
    return { result, operations };
  }

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

  transpose(block) {
    return block.split('').reverse().join('');
  }

  transposeInverse(block) {
    return block.split('').reverse().join('');
  }

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
    }

    for (let round = 0; round < this.numRounds; round++) {
      const beforeSub = currentBlock;

      console.log('Ronda', round + 1);
      console.log(
        'keys:',
        keys[round].map((v) => v.toFixed(4)),
      );
      console.log(' ');
      console.log('iv:', iv);
      console.log('bloque', currentBlock);

      const substitutionResult = this.substitute(
        currentBlock,
        keys[round],
        round,
        iv,
      );
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

  decryptBlock(block, keys, iv, previousCiphertext = null) {
    let currentBlock = block;
    const steps = [];

    const originalBlock = currentBlock;

    for (let round = this.numRounds - 1; round >= 0; round--) {
      const beforeTransInv = currentBlock;

      console.log(' ');
      console.log('bloque', currentBlock);
      currentBlock = this.transposeInverse(currentBlock);

      const afterTransInv = currentBlock;

      console.log('Ronda', round + 1);
      console.log(
        'keys:',
        keys[round].map((v) => v.toFixed(4)),
      );
      console.log(' ');
      console.log('iv:', iv);

      const substitutionResult = this.substituteInverse(
        currentBlock,
        keys[round],
        round,
        iv,
      );
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

    if (
      blocks.length > 0 &&
      blocks[blocks.length - 1].length < this.blockSize
    ) {
      blocks[blocks.length - 1] = blocks[blocks.length - 1].padEnd(
        this.blockSize,
        'x',
      );
    }

    const encryptedResults = [];
    const encryptedBlocks = [];

    for (let i = 0; i < blocks.length; i++) {
      const previousCiphertext = i > 0 ? encryptedBlocks[i - 1] : null;
      const result = this.encryptBlock(blocks[i], keys, iv, previousCiphertext);

      encryptedResults.push(result);
      encryptedBlocks.push(result.result);
    }

    const allSteps = encryptedResults.map((result, blockIndex) => {
      return {
        blockIndex,
        originalBlock: blocks[blockIndex],
        steps: result.steps,
      };
    });

    const sampleIterations = 5;
    const { table: lcgTable } = this.calculateLCGTable(
      lcgParams.seed,
      lcgParams.a,
      lcgParams.c,
      lcgParams.m,
      sampleIterations,
      0,
      1,
    );

    const lcgSample = lcgTable.map(([i, Xi, ri, ni]) => ({
      i: i,
      Xi: Xi,
      ri: ri,
      ni: ni,
    }));
    return {
      original: cleanText,
      encrypted: encryptedBlocks.join(''),
      numBlocks: blocks.length,
      blocks: blocks,
      encryptedBlocks: encryptedBlocks,
      steps: allSteps,
      keys: keys.map((k) => k.map((v) => v.toFixed(4)).join(', ')),
      iv: iv.join(', '),
      decryptionKey: usedKey,
      lcgParams,
      lcgSample,
    };
  }

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

    const allSteps = decryptedResults.map((result, blockIndex) => {
      return {
        blockIndex,
        encryptedBlock: blocks[blockIndex],
        steps: result.steps,
      };
    });

    const sampleIterations = 5;
    const { table: lcgTable } = this.calculateLCGTable(
      lcgParams.seed,
      lcgParams.a,
      lcgParams.c,
      lcgParams.m,
      sampleIterations,
      0,
      1,
    );

    const lcgSample = lcgTable.map(([i, Xi, ri, ni]) => ({
      i: i,
      Xi: Xi,
      ri: ri,
      ni: ni,
    }));

    let decryptedText = decryptedBlocks.join('');
    decryptedText = decryptedText.replace(/x+$/, '');

    return {
      encrypted: cipherText,
      decrypted: decryptedText,
      numBlocks: blocks.length,
      blocks: blocks,
      decryptedBlocks: decryptedBlocks,
      steps: allSteps,
      keys: keys.map((k) => k.map((v) => v.toFixed(4)).join(', ')),
      iv: iv.join(', '),
      lcgParams,
      lcgSample,
    };
  }
}

module.exports = BlockCipher;
