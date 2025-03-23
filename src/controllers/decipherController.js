const BlockCipher = require('../models/BlockCipher');

const decipherController = {
  decryptText: (req, res) => {
    try {
      const { texto_cifrado, clave_descifrado } = req.body;

      const cipher = new BlockCipher();

      let result;

      result = cipher.decrypt(texto_cifrado, clave_descifrado || cipher.secretKey);

      const bloques = result.blocks.map((block, index) => {
        return {
          cifrado: block,
          descifrado: result.decryptedBlocks[index],
        };
      });

      res.render('resultado', {
        operacion: 'descifrado',
        textoCifrado: result.encrypted,
        textoDescifrado: result.decrypted,
        detalles: {
          numBloques: result.numBlocks,
          numRondas: cipher.numRounds,
          longitudBloque: cipher.blockSize,
          vectorInicializacion: result.iv,
          lcgParams: result.lcgParams,
          lcgSample: result.lcgSample,
        },
        bloques: bloques,
        pasos: result.steps,
      });
    } catch (error) {
      console.error('Error al descifrar:', error);
      res.status(500).send('Error al descifrar el texto');
    }
  },
};

module.exports = decipherController;
