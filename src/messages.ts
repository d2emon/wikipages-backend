import { WIKI_MAX_NOTE_BYTES } from './config';

const messages = {
    // Seeding

    WIKI_IS_NOT_EMPTY: 'Wiki is not empty — data not seeded.',
    SEED_NOT_FOUND: 'Folder seed not found — data not seeded.',
    SEED_ERROR: 'Cannot seed data:',
    SEED_OK: 'Data is seeded.',    

    // Notes

    NOTE_META_READ_ERROR: 'Note meta read error:',

    // Error

    // 400
    INCORRECT_JSON: 'Incorrect JSON',
    INVALID_DATA: 'Invalid data',
    JSON_NEEDED: 'JSON needs string content',
    MARKDOWN_NEEDED: 'Awaiting Markdown in request body',
    INCORRECT_PATH_ENCODING: 'Incorrect path encoding',
    EMPTY_PATH_SEGMENT: 'Empty path segment',
    INVALID_PATH_SEGMENT: 'Invalid path segment',
    DOTTED_PATH_SEGMENT: 'Path segment cannot start with "."',
    PATH_SEGMENT_END_WITH_DOT: 'Path segment cannot end with " "',
    PATH_SEGMENT_INVALID_CHARACTERS: 'Invalid characters in path',
    PATH_SEGMENT_TOO_LONG: 'Path segment is too long',
    PATH_EMPTY: 'Note path is empty',
    PATH_TOO_LONG: 'Note path is too long',
    PATH_INCORRECT: 'Incorrect note path',
    // 401
    UNAUTHORIZED: 'API-key is required',
    // 404
    PATH_NOT_FOUND: 'Path not found',
    PATH_IS_EMPTY: 'Путь заметки не указан',
    INVALID_EXTENSION: 'Add .md or .html ath path end',
    NOTE_NOT_FOUND: 'Note not found',
    // 405
    INCORRECT_METHOD: 'Incorrect method',
    // 409
    NOTE_EXISTS: 'Заметка с таким путём уже существует',
    // 413
    REQUEST_TOO_LARGE: 'Request body is too large',
    NOTE_TOO_BIG: `Note is bigger than ${Math.floor(WIKI_MAX_NOTE_BYTES / 1024)} KB`,
    // 500
    SERVER_ERROR: 'Server internal error',
    // 503
    NO_API_KEY: 'Write mode off: set WIKI_API_KEY in environment variables.',
};

export default messages;
