public static prepareTexteAvantEnvoi(
    value: string = '',
    maxLength: number = 60
): string {

    const cleanedText: string =
        this.replaceSpecialChars(value);

    return this.splitTexteAvantEnvoi(
        cleanedText,
        maxLength
    );
}

const commentaire: string =
    ConverterService.prepareTexteAvantEnvoi(
        this.commentaire,
        60
    );

    const dataIn: DataInModelInterface = {
    idDossier: this.service.getCommunContexte().dossierId,
    resourceId: this.service.getCommunContexte().resourceId,

    parameters: {
        dateTraitement: this.dateTraitement,
        heureTraitement: this.heureTraitement,
        commentaire: ConverterService.prepareTexteAvantEnvoi(
            this.commentaire,
            60
        )
    },

    screenkey: this.Constantes.SCREEN_GENERIC
};


private static readonly SPECIAL_CHARACTERS: Record<string, string> = {
    '’': '\'',
    '‘': '\'',
    '`': '\'',
    '´': '\'',
    '“': '"',
    '”': '"',
    '«': '"',
    '»': '"',
    '–': '-',
    '—': '-',
    '−': '-',
    '\u00A0': ' '
};

public static replaceSpecialChars(value: string = ''): string {
    return value
        .normalize('NFKC')
        .replace(
            /[’‘`´“”«»–—−\u00A0]/g,
            (char: string) => this.SPECIAL_CHARACTERS[char] ?? char
        )
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

public static splitTexteAvantEnvoi(
    value: string = '',
    maxLength: number = 60
): string {

    if (!value || maxLength <= 0) {
        return value;
    }

    return value
        .split('\n')
        .flatMap((line: string) => this.wrapLine(line, maxLength))
        .join('\n');
}

private static wrapLine(
    value: string,
    maxLength: number
): string[] {

    const words: string[] = value
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) {
        return [''];
    }

    return words.reduce(
        (lines: string[], word: string) => {

            const lastIndex: number = lines.length - 1;
            const currentLine: string = lines[lastIndex];

            /*
             * Mot plus long que la limite :
             * on est obligé de le découper.
             */
            if (word.length > maxLength) {

                if (currentLine) {
                    lines.push('');
                }

                for (
                    let index = 0;
                    index < word.length;
                    index += maxLength
                ) {
                    lines.push(
                        word.substring(index, index + maxLength)
                    );
                }

                if (
                    lines[lines.length - 1].length === maxLength
                ) {
                    lines.push('');
                }

                return lines;
            }

            const candidate: string =
                currentLine
                    ? `${currentLine} ${word}`
                    : word;

            /*
             * Le mot tient sur la ligne actuelle.
             */
            if (candidate.length <= maxLength) {
                lines[lastIndex] = candidate;
            } else {
                /*
                 * Nouvelle ligne.
                 */
                lines.push(word);
            }

            return lines;
        },
        ['']
    ).filter(
        (line: string, index: number, lines: string[]) =>
            line !== '' || index < lines.length - 1
    );
}
