from fastapi import APIRouter

router = APIRouter()

COMMISSION_RATES = {
    'level_1': 0.10,  # 10% do lucro dos indicados diretos
    'level_2': 0.03,  # 3%
    'level_3': 0.01,  # 1%
}


@router.get('/link')
async def get_referral_link():
    return {
        'referral_code': 'USER123',
        'referral_url': 'https://cechella.app/ref/USER123',
    }


@router.get('/network')
async def get_network():
    return {
        'level_1': [],
        'level_2': [],
        'level_3': [],
        'earnings_this_month': 0.0,
        'earnings_total': 0.0,
        'commission_rates': COMMISSION_RATES,
    }
