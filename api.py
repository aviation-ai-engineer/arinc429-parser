
# File 3: api.py - Flask REST API

api_code = '''"""
Flask REST API for ARINC 429 Parser
Production-grade API with validation, CORS, logging, and error handling
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from typing import Dict, List, Any
from arinc429_parser import ARINC429Parser, decode_word, decode_batch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize parser (singleton pattern for performance)
parser = ARINC429Parser()


@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    
    Returns:
        JSON response with API status
    """
    return jsonify({
        'status': 'ok',
        'service': 'ARINC 429 Parser API',
        'version': '1.0.0',
        'statistics': parser.get_statistics()
    }), 200


@app.route('/decode', methods=['POST'])
def decode_single():
    """
    Decode a single ARINC 429 word
    
    Request body:
        {
            "word": "0x80555555" | 2155905365 | "0b10000000..."
        }
    
    Returns:
        JSON response with decoded fields or error
    """
    try:
        # Validate request
        if not request.json:
            return jsonify({
                'error': 'Request body must be JSON',
                'status': 'error'
            }), 400
        
        # Get word from request
        word = request.json.get('word')
        if word is None:
            return jsonify({
                'error': 'Missing required field: word',
                'status': 'error'
            }), 400
        
        # Decode word
        result = parser.decode(word)
        
        # Log request
        logger.info(f"Decoded word: {word} -> Label: {result.label}, Valid: {result.is_valid}")
        
        # Return result
        return jsonify({
            'status': 'success',
            'result': result.to_dict()
        }), 200
        
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 400
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500


@app.route('/batch-decode', methods=['POST'])
def decode_multiple():
    """
    Decode multiple ARINC 429 words
    
    Request body:
        {
            "words": ["0x80555555", 2155905365, ...]
        }
    
    Returns:
        JSON response with array of decoded fields
    """
    try:
        # Validate request
        if not request.json:
            return jsonify({
                'error': 'Request body must be JSON',
                'status': 'error'
            }), 400
        
        # Get words from request
        words = request.json.get('words')
        if words is None:
            return jsonify({
                'error': 'Missing required field: words',
                'status': 'error'
            }), 400
        
        if not isinstance(words, list):
            return jsonify({
                'error': 'Field "words" must be an array',
                'status': 'error'
            }), 400
        
        # Limit batch size for performance
        MAX_BATCH_SIZE = 10000
        if len(words) > MAX_BATCH_SIZE:
            return jsonify({
                'error': f'Batch size exceeds maximum of {MAX_BATCH_SIZE}',
                'status': 'error'
            }), 400
        
        # Decode all words
        results = parser.decode_batch(words)
        
        # Log request
        logger.info(f"Batch decoded {len(words)} words")
        
        # Return results
        return jsonify({
            'status': 'success',
            'count': len(results),
            'results': [r.to_dict() for r in results]
        }), 200
        
    except Exception as e:
        logger.error(f"Unexpected error in batch decode: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500


@app.route('/statistics', methods=['GET'])
def get_statistics():
    """
    Get parser statistics
    
    Returns:
        JSON response with decoding statistics
    """
    stats = parser.get_statistics()
    return jsonify({
        'status': 'success',
        'statistics': stats
    }), 200


@app.route('/statistics', methods=['DELETE'])
def reset_statistics():
    """
    Reset parser statistics
    
    Returns:
        JSON response confirming reset
    """
    parser.reset_statistics()
    logger.info("Statistics reset")
    return jsonify({
        'status': 'success',
        'message': 'Statistics reset successfully'
    }), 200


@app.route('/validate', methods=['POST'])
def validate_word():
    """
    Validate ARINC 429 word without full decoding
    
    Request body:
        {
            "word": "0x80555555"
        }
    
    Returns:
        JSON response with validation status only
    """
    try:
        if not request.json:
            return jsonify({
                'error': 'Request body must be JSON',
                'status': 'error'
            }), 400
        
        word = request.json.get('word')
        if word is None:
            return jsonify({
                'error': 'Missing required field: word',
                'status': 'error'
            }), 400
        
        # Decode and check validity
        result = parser.decode(word)
        
        return jsonify({
            'status': 'success',
            'is_valid': result.is_valid,
            'error_msg': result.error_msg
        }), 200
        
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'status': 'error',
            'is_valid': False
        }), 400
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Endpoint not found',
        'status': 'error'
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({
        'error': 'Method not allowed',
        'status': 'error'
    }), 405


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'error': 'Internal server error',
        'status': 'error'
    }), 500


if __name__ == '__main__':
    # Run in development mode
    # For production, use gunicorn: gunicorn api:app
    app.run(host='0.0.0.0', port=5000, debug=False)
'''

with open('api.py', 'w') as f:
    f.write(api_code)

print("✓ Generated: api.py")
print(f"  Lines: {len(api_code.splitlines())}")
print(f"  Endpoints: 7")
print(f"  Features: CORS, logging, validation, error handling")
