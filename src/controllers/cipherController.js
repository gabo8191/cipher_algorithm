const BlockCipher = require('../models/BlockCipher');

const cipherController = {
  encryptText: (req, res) => {
    try {
      const { texto_claro, secret_key } = req.body;

      const cipher = new BlockCipher();

      const result = cipher.encrypt(texto_claro, secret_key || cipher.secretKey);

      const bloques = result.blocks.map((block, index) => {
        return {
          original: block,
          cifrado: result.encryptedBlocks[index],
        };
      });

      res.render('resultado', {
        operacion: 'cifrado',
        textoOriginal: result.original,
        textoCifrado: result.encrypted,
        detalles: {
          numBloques: result.numBlocks,
          numRondas: cipher.numRounds,
          longitudBloque: cipher.blockSize,
          vectorInicializacion: result.iv,
          claveDescifrado: result.decryptionKey,
          lcgParams: result.lcgParams,
          lcgSample: result.lcgSample,
        },
        bloques: bloques,
        pasos: result.steps,
      });
    } catch (error) {
      console.error('Error al cifrar:', error);
      res.status(500).send('Error al cifrar el texto');
    }
  },
};

module.exports = cipherController;
