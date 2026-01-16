// utils/passwordGenerator.js
// Generates a session password: 4-letter English word + 4 random digits

const fourLetterWords = [
    'able', 'acid', 'aged', 'also', 'area', 'army', 'away', 'baby', 'back', 'ball',
    'band', 'bank', 'base', 'bath', 'bear', 'beat', 'been', 'beer', 'bell', 'belt',
    'best', 'bird', 'blow', 'blue', 'boat', 'body', 'bomb', 'bond', 'bone', 'book',
    'boom', 'born', 'boss', 'both', 'bowl', 'bulk', 'burn', 'bush', 'busy', 'cake',
    'call', 'calm', 'came', 'camp', 'card', 'care', 'case', 'cash', 'cast', 'cell',
    'chat', 'chip', 'city', 'clay', 'club', 'coal', 'coat', 'code', 'cold', 'come',
    'cook', 'cool', 'cope', 'copy', 'core', 'corn', 'cost', 'crew', 'crop', 'dark',
    'data', 'date', 'dawn', 'days', 'dead', 'deal', 'dean', 'dear', 'debt', 'deep',
    'deny', 'desk', 'diet', 'disc', 'disk', 'dock', 'does', 'done', 'door', 'dose',
    'down', 'draw', 'drew', 'drop', 'drug', 'dual', 'duke', 'dull', 'dust', 'duty',
    'each', 'earn', 'ease', 'east', 'easy', 'edge', 'else', 'even', 'ever', 'evil',
    'exit', 'face', 'fact', 'fail', 'fair', 'fall', 'farm', 'fast', 'fate', 'fear',
    'feed', 'feel', 'feet', 'fell', 'felt', 'file', 'fill', 'film', 'find', 'fine',
    'fire', 'firm', 'fish', 'five', 'flat', 'fled', 'flew', 'flow', 'folk', 'food',
    'foot', 'ford', 'form', 'fort', 'four', 'free', 'from', 'fuel', 'full', 'fund',
    'gain', 'game', 'gate', 'gave', 'gear', 'gene', 'gift', 'girl', 'give', 'glad',
    'goal', 'goes', 'gold', 'golf', 'gone', 'good', 'gray', 'grew', 'grey', 'grow',
    'gulf', 'hair', 'half', 'hall', 'hand', 'hang', 'hard', 'harm', 'hate', 'have',
    'head', 'hear', 'heat', 'held', 'hell', 'help', 'here', 'hero', 'high', 'hill',
    'hire', 'hold', 'hole', 'holy', 'home', 'hope', 'host', 'hour', 'huge', 'hung',
    'hunt', 'hurt', 'idea', 'inch', 'into', 'iron', 'item', 'jack', 'jane', 'john',
    'join', 'jump', 'jury', 'just', 'keen', 'keep', 'kent', 'kept', 'kick', 'kill',
    'kind', 'king', 'knee', 'knew', 'know', 'lack', 'lady', 'laid', 'lake', 'land',
    'lane', 'last', 'late', 'lead', 'left', 'less', 'life', 'lift', 'like', 'line',
    'link', 'list', 'live', 'load', 'loan', 'lock', 'long', 'look', 'lord', 'lose',
    'loss', 'lost', 'love', 'luck', 'made', 'mail', 'main', 'make', 'male', 'mall',
    'many', 'mark', 'mass', 'mate', 'meal', 'mean', 'meat', 'meet', 'menu', 'mere',
    'mile', 'milk', 'mill', 'mind', 'mine', 'miss', 'mode', 'mood', 'moon', 'more',
    'most', 'move', 'much', 'must', 'name', 'navy', 'near', 'neck', 'need', 'news',
    'next', 'nice', 'night', 'nine', 'none', 'nose', 'note', 'once', 'only', 'onto',
    'open', 'oral', 'over', 'pace', 'pack', 'page', 'paid', 'pain', 'pair', 'palm',
    'park', 'part', 'pass', 'past', 'path', 'peak', 'pick', 'pile', 'pine', 'pink',
    'pipe', 'plan', 'play', 'plot', 'plug', 'plus', 'poem', 'poet', 'pole', 'poll',
    'pond', 'pool', 'poor', 'pope', 'port', 'pose', 'post', 'pour', 'pray', 'pure',
    'push', 'race', 'rail', 'rain', 'rank', 'rare', 'rate', 'read', 'real', 'rear',
    'rely', 'rent', 'rest', 'rice', 'rich', 'ride', 'ring', 'rise', 'risk', 'road',
    'rock', 'role', 'roll', 'roof', 'room', 'root', 'rope', 'rose', 'rule', 'rush',
    'safe', 'said', 'sake', 'sale', 'salt', 'same', 'sand', 'save', 'seat', 'seed',
    'seek', 'seem', 'seen', 'self', 'sell', 'send', 'sent', 'sept', 'ship', 'shop',
    'shot', 'show', 'shut', 'side', 'sign', 'sing', 'sink', 'site', 'size', 'skin',
    'slip', 'slow', 'snow', 'soft', 'soil', 'sold', 'sole', 'some', 'song', 'soon',
    'sort', 'soul', 'spot', 'star', 'stay', 'step', 'stop', 'such', 'suit', 'sure',
    'take', 'tale', 'talk', 'tall', 'tank', 'tape', 'task', 'team', 'tear', 'tell',
    'tend', 'term', 'test', 'text', 'than', 'that', 'them', 'then', 'they', 'thin',
    'this', 'thus', 'tide', 'till', 'time', 'tiny', 'told', 'toll', 'tone', 'took',
    'tool', 'tour', 'town', 'tree', 'trip', 'true', 'tune', 'turn', 'twin', 'type',
    'unit', 'upon', 'used', 'user', 'vary', 'vast', 'very', 'vice', 'view', 'vote',
    'wage', 'wait', 'wake', 'walk', 'wall', 'want', 'ward', 'warm', 'warn', 'wash',
    'wave', 'ways', 'weak', 'wear', 'week', 'well', 'went', 'were', 'west', 'what',
    'when', 'wide', 'wife', 'wild', 'will', 'wind', 'wine', 'wing', 'wire', 'wise',
    'wish', 'with', 'wood', 'word', 'wore', 'work', 'worn', 'yard', 'yeah', 'year',
    'your', 'zone'
];

/**
 * Generates a session password consisting of a 4-letter English word followed by 4 random digits.
 * @returns {string} e.g. "bark1234"
 */
function generateSessionPassword() {
    const word = fourLetterWords[Math.floor(Math.random() * fourLetterWords.length)];
    const digits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return word + digits;
}

module.exports = { generateSessionPassword };
