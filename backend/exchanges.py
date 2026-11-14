"""Exchange identifiers shared by asset listings and trading sessions."""
EXCHANGES = {
    'TSX': dict(name='Toronto Stock Exchange', city='Toronto', zone='America/Toronto'),
    'NASDAQ': dict(name='Nasdaq', city='New York', zone='America/New_York'),
    'NYSE': dict(name='New York Stock Exchange', city='New York', zone='America/New_York'),
    'LSE': dict(name='London Stock Exchange', city='London', zone='Europe/London'),
    'TSE': dict(name='Tokyo Stock Exchange', city='Tokyo', zone='Asia/Tokyo'),
    'HKEX': dict(name='Hong Kong Stock Exchange', city='Hong Kong', zone='Asia/Hong_Kong'),
    'ASX': dict(name='Australian Securities Exchange', city='Sydney', zone='Australia/Sydney'),
    'AMEX': dict(name='NYSE American', city='New York', zone='America/New_York'),
    'CBOE': dict(name='Cboe', city='New York', zone='America/New_York'),
    'US': dict(name='Other U.S. listing', city='New York', zone='America/New_York'),
    'CRYPTO': dict(name='Cryptocurrency', city='UTC', zone='UTC'),
}


def exchange_code(symbol='', asset_type='STOCK', exchange=''):
    if asset_type.upper() == 'CRYPTO':
        return 'CRYPTO'
    for suffix, code in (('.TO', 'TSX'), ('.L', 'LSE'), ('.T', 'TSE'), ('.HK', 'HKEX'), ('.AX', 'ASX')):
        if symbol.endswith(suffix):
            return code
    aliases = {'TSXV': 'TSX', 'TORONTO': 'TSX', 'NYSE AMERICAN': 'AMEX', 'NYSE ARCA': 'NYSE',
               'US EXCHANGE': 'US', 'JPX': 'TSE'}
    code = aliases.get(exchange.upper(), exchange.upper())
    return code if code in EXCHANGES else 'US'
