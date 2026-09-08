/**
 * @file legalTexts.js
 * @description Catálogo oficial de textos jurídicos para el Simulador de Dactilografía Judicial.
 * Contiene los textos normativos y acuerdos reglamentarios del Poder Judicial de Corrientes y CCCN.
 * 
 * NOTA DE INTEGRIDAD:
 * Los textos deben conservarse con fidelidad absoluta caracter a caracter (incluyendo numeraciones,
 * puntuaciones y comillas), ya que el algoritmo oficial de evaluación judicial calcula penalizaciones
 * exactas basadas en estas cadenas de caracteres.
 */

/**
 * @typedef {Object} LegalText
 * @property {number} id - Identificador numérico único del texto.
 * @property {string} title - Título descriptivo oficial.
 * @property {string} content - Contenido normativo completo a tipear por el postulante.
 * @property {boolean} [isCustom] - Indicador opcional de texto personalizado por el usuario.
 */

/**
 * Textos judiciales oficiales inmutables.
 * @type {ReadonlyArray<LegalText>}
 */
export const LEGAL_TEXTS = Object.freeze([
    Object.freeze({
        id: 1,
        title: "Constitución Provincial (Corrientes) - Art. 41 y ss.",
        content: "Artículo 41.- Las disposiciones de este Título serán aplicables a todo el personal judicial comprendiéndose en esta denominación los Magistrados, Funcionarios, Secretarios, Técnicos Profesionales, empleados administrativos y personal de servicio y maestranza de todas las reparticiones dependientes del Poder Judicial de la Provincia, con las excepciones que en cada caso se determine."
    }),
    Object.freeze({
        id: 2,
        title: "Código Civil y Comercial - Obligaciones",
        content: "Artículo 724.- Obligación. La obligación es una relación jurídica en virtud de la cual el acreedor tiene el derecho a exigir del deudor una prestación destinada a satisfacer un interés lícito y, ante el incumplimiento, a obtener forzadamente la satisfacción de dicho interés."
    }),
    Object.freeze({
        id: 3,
        title: "Acuerdo Nº 20/24 (Punto 14º) - Bus Federal de Justicia",
        content: "DECIMO CUARTO: Visto: El Expte. 09-E-1374-2023, donde se propone la actualización del \"Convenio de Comunicación Electrónica Interjurisdiccional\"; su \"Protocolo Técnico\" y la implementación del sistema Bus Federal de Justicia para el envío y recepción de comunicaciones interjurisdiccionales; Y CONSIDERANDO: Que por Acuerdo Nº 17/16, de fecha 23 de junio de 2016, punto 7º, se dispuso la adhesión del Poder Judicial de la Provincia de Corrientes, a la \"Actualización del Convenio de Comunicación Electrónica Interjurisdiccional\" y su \"Protocolo Técnico\", propuesto por la Junta Federal de Cortes y Superiores Tribunales de Justicia de las Provincias Argentinas y Ciudad Autónoma de Buenos Aires (JU.FE.JUS.). Con posterioridad, en fecha 2 de junio de 2023, la JU.FE.JUS. dispuso actualizar el Convenio de Comunicación Electrónica Interjurisdiccional y su Protocolo Técnico, a fin de incorporar una solución tecnológica denominada \"Bus Federal de Justicia\", que, entre otras funciones, permitirá una comunicación y un intercambio ágil y seguro de documental, de forma electrónica, entre todos los organismos integrados a dicha plataforma, sin necesidad de establecer canales individuales, evitando así múltiples desarrollos redundantes; brindar seguridad transaccional; integración sencilla con los sistemas de los organismos usuarios; posibilidad de integrar con los mecanismos de autenticación de cada organismo; certificación mediante función Escribano Digital y registro preciso y seguro de las transacciones integrado implementaciones de Blockchain. Que el Poder Judicial de la Provincia está en condiciones técnicas de unirse e implementar el Bus Federal de Justicia, dado que ya se han realizado las tareas de instalación de los componentes requeridos para su funcionamiento. Por ello y oído el Sr. Fiscal General; SE RESUELVE: 1º) Adherir a la \"Actualización del Convenio de Comunicación Electrónica Interjurisdiccional\" y su \"Protocolo Técnico\" que como Anexo forma parte del presente. 2º) Designar como referentes para la implementación, administración y funcionamiento de la plataforma Bus Federal de Justicia, a las Dras. Mirta Allende y María Andrea Ferreira. 3º) Hacer saber la presente a la Junta Federal de Cortes y Superiores Tribunales de Justicia de las Provincias Argentinas y Ciudad Autónoma de Buenos Aires. 4º) Publicar en la página web del Poder Judicial para su difusión."
    }),
    Object.freeze({
        id: 4,
        title: "Acuerdo Nº 27/25 (Punto 13º) - Cédulas y Mandamientos",
        content: "DECIMO TERCERO: Visto: Que por Acuerdo Nº 20/24, punto 14º, el Poder Judicial de Corrientes adhirió a la \"Actualización del Convenio de Comunicación Electrónica Interjurisdiccional\" y su \"Protocolo Técnico\" con el fin de incorporar progresivamente las tecnologías en las comunicaciones jurisdiccionales a través del Bus Federal de Justicia. Considerando: Que el Bus Federal de Justicia permite un intercambio ágil y seguro de documentos de forma electrónica entre los poderes judiciales adheridos. A tal fin, se dispuso que la Mesa Receptora Informatizada de Expedientes de la Primera Circunscripción sería el único órgano en toda la provincia encargado de la recepción y envío de documentos electrónicos a través del Bus Federal de Justicia. Que a fin de optimizar la comunicación interjurisdiccional y brindar mayor eficiencia en la tramitación de cédulas y mandamientos, se hace necesaria la modificación de los circuitos operativos actuales. Esto permitirá una gestión más eficiente y una mejor trazabilidad de las notificaciones, cumpliendo con los objetivos del Convenio de Comunicación Electrónica Interjurisdiccional. Por todo ello y oído el Sr. Fiscal General; SE RESUELVE: 1º) Disponer a partir del 01 de octubre de 2025, la modificación de los circuitos operativos internos de recepción y envíos de Cédulas y Mandamientos Ley Convenio 22.172 a través de la plataforma del Bus Federal de Justicia. 2º) Ordenar el registro de alta para la Dirección General de Mandamientos y Notificaciones como nuevo organismo de la provincia de Corrientes en la plataforma Bus Federal. 3º) Establecer que a partir de la implementación de este nuevo circuito, la Dirección General de Mandamientos y Notificaciones será el único organismo encargado de recibir y enviar cédulas y mandamientos Ley Nº 22172 a través de la plataforma Bus Federal. 4º) Mantener el circuito operativo de la Mesa Receptora Informatizada de Expedientes exclusivamente para la recepción y envío de oficios Ley 22172 a través de la plataforma Bus Federal. 5º) Establecer que los juzgados y tribunales de toda la provincia enviarán y recibirán los oficios, cédulas y mandamientos Ley 22172 a la Mesa Receptora Informatizada y/o a la Dirección General de Mandamientos y Notificaciones -según corresponda- a través de la plataforma Forum."
    })
]);

/**
 * Texto judicial predeterminado para el arranque del simulador.
 * @type {LegalText}
 */
export const DEFAULT_LEGAL_TEXT = LEGAL_TEXTS[0];

/**
 * Busca un texto judicial por su ID identificador.
 * Si no lo encuentra en los oficiales, busca en la lista de personalizados provista.
 * 
 * @param {number|string} id - ID del texto buscado.
 * @param {LegalText[]} [customTexts=[]] - Textos personalizados adicionales del postulante.
 * @returns {LegalText} Texto hallado o DEFAULT_LEGAL_TEXT si no existe.
 */
export const getLegalTextById = (id, customTexts = []) => {
    const numericId = Number(id);
    const official = LEGAL_TEXTS.find(t => t.id === numericId);
    if (official) return official;

    const custom = customTexts.find(t => t.id === numericId);
    if (custom) return custom;

    return DEFAULT_LEGAL_TEXT;
};

/**
 * Combina los textos oficiales inmutables con los textos personalizados cargados por el usuario.
 * Garantiza que los textos oficiales siempre aparezcan primero y sin duplicaciones de ID.
 * 
 * @param {LegalText[]} [customTexts=[]] - Lista de textos personalizados persistidos en storage.
 * @returns {LegalText[]} Lista unificada y limpia de textos disponibles.
 */
export const getAllLegalTexts = (customTexts = []) => {
    if (!Array.isArray(customTexts) || customTexts.length === 0) {
        return [...LEGAL_TEXTS];
    }

    const officialIds = new Set(LEGAL_TEXTS.map(t => t.id));
    const sanitizedCustom = customTexts
        .filter(t => t && t.title && t.content && !officialIds.has(t.id))
        .map(t => ({
            id: t.id,
            title: t.title,
            content: t.content,
            isCustom: true
        }));

    return [...LEGAL_TEXTS, ...sanitizedCustom];
};
