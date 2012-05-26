/*-
 * Copyright (c) 2010 Jose L. Hidalgo "PpluX" (joseluis.hidalgo@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL COPYRIGHT HOLDERS OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

// You can redefine PJSON_INCLUDE to include pJSON.h file from other file
// path
#ifndef PJSON_INCLUDE
	#define PJSON_INCLUDE "pJSON.h"
#endif

#include PJSON_INCLUDE
#include <cstdlib>
#include <sstream>

PJSON_NAMESPACE_BEGIN

class Lexer {
public:
	Lexer(std::istream &is) : _is(is), _current(0), _prev(0), _line(1), _pos(1)
	{
		// get a character (current)
		get();
	}

	bool end() const { return _current == -1; }

	Value parseFalse()
	{
		ws();	
		if (check("false")) return Value::create(false);
		error("Expected 'false' literal");
		return Value();
	};

	Value parseTrue()
	{
		ws();	
		if (check("true")) return Value::create(true);
		error("Expected 'true' literal");
		return Value();
	};

	Value parseNull()
	{
		ws();	
		if (check("null")) return Value::create();
		error("Expected 'null' literal");
		return Value();
	};

	Value parseString()
	{
		ws();	
		std::stringstream ss;
		if (!check(T_quotation_mark)) { error("expected '\"'"); return Value(); }
		while(!end() && ( C() != T_quotation_mark || P() == T_escape) ) { ss << (char) C(); get(); }
		if (!check(T_quotation_mark)) { error("expected '\"'"); return Value(); }
		return Value::create(ss.str());
	}

	Value parseObject()
	{
		ws();	
		Value result = Value::createObject();
		Value::T_Object &map = result.asObject();
		
		// left
		if (!check(T_begin_object)) error ("expected '{'");
		for(;;)
		{
			ws();
			if ( C() == T_end_object ) { get(); /*consume it*/ break; }
			Value key = parseString();
			if (!key.valid()) { error ("Invalid key, expected string"); return Value(); }
			ws();
			if(!check(T_name_separator)) error ("expected ':'");
			ws();
			Value value = parseValue();
			if (!value.valid()) { error("Invalid value"); return Value(); }
			map[key.asString()] = value;
			ws(); get(); // avanve an element, ({|,) -> at P()
			if ( P() == T_end_object ) break;
			if ( P() != T_value_separator ) { error("expected '}' or ','"); return Value(); }
		}

		return result;
	};

	Value parseArray()
	{
		ws();	
		Value result = Value::createArray();
		Value::T_Array &vect = result.asArray();
		
		// left
		if (!check(T_begin_array)) error ("expected '['");
		for(;;)
		{
			ws();
			if ( C() == T_end_array ) { get(); /*consume it*/ break; }
			Value v = parseValue();
			Value value = v;
			if (!value.valid()) { error("Invalid value"); return Value(); }
			vect.push_back(value);
			ws(); get(); // to next element, ({|,) -> at P()
			if ( P() == T_end_array ) break;
			if ( P() != T_value_separator ) { error("expected ']' or ','"); return Value(); }
		}

		return result;
	};

	Value parseNumber()
	{
		// use strtod, not a real JSON value, but... close
		char buff[1024];
		unsigned int length = 0;
		while (
			(C() >= '0' && C() <='9') ||
			C() == 'e' || C() == 'E' ||
			C() == '.' || C() == '+' || C() == '-'
		) { buff[length++] = C(); get(); }
		buff[length] = '\0';
		char *end;
		double d = strtod(buff, &end);
		if ((size_t)end - (size_t)buff != length) { error("Invalid Number"); return Value(); }
		return Value::create(d);
	}

	Value parseValue()
	{
		ws();
		switch(C())
		{
			case 'f': return parseFalse(); break;
			case 't': return parseTrue(); break;
			case 'n': return parseNull(); break;
			case T_begin_object: return parseObject(); break;
			case T_begin_array: return parseArray(); break;
			case T_quotation_mark: return parseString(); break;
			default:
				if (C() == T_minus || ( C() >= '0' && C() <= '9'))
				{
					return parseNumber();
				}
				break;
		}
		error("expected a Value");
		return Value();
	}

protected:
	void error(const char *msg)
	{
		std::cerr << "Error at @" << _line << "," << _pos << " -> " << msg << std::endl;
	}

	int C() const { return _current; }
	int P() const { return _prev; }

	int get() /*next item*/
	{
		if (_current != -1)
		{
			_prev = _current;
			if (_is.good()) 
			{
				_current = _is.get();
				if (_current == T_new_line) { _pos = 1; _line++; }
				else _pos++;
			}
			else _current = -1;
		}
		return _current;
	}

	bool isChar() const
	{
		if (
			(C() >= 0x20 && C() < 0x21) ||
			(C() >= 0x23 && C() < 0x5B) ||
			(C() >= 0x5D && C() < 0x10FFFF))
		{
			return true;
		}
		else if( P() == T_escape )
		{
			if (C() == T_quotation_mark ||
				C() == T_reverse_solidus ||
				C() == T_solidus ||
				C() == T_backspace ||
				C() == T_form_feed ||
				C() == T_line_feed ||
				C() == T_carriage_return ||
				C() == T_tab
			   )
			{
				return true;
			}
		}
		// otherwise
		return false;
	}

	bool isAlpha() const
	{
		return (
			(C() >= 'a' && C() <= 'z') ||
			(C() >= 'A' && C() <= 'Z') ||
			(C() == '_'));
	}

	bool isNumeric() const
	{
		return (C() >= '0' && C() <= '9');
	}
	
	// consume whitespaces
	void ws()
	{
		while(!end())
		{
			if (
				C() != T_space &&
				C() != T_horizontal_tab &&
				C() != T_carriage_return &&
				C() != T_new_line ) break;
			get();
		}
	}

	bool check(int c)
	{
		bool r = (C() == c);
		get();
		return r;
	}
	
	bool check(const char *txt)
	{
		while(*txt != '\0')
		{
			if ( *txt != C() ) return false;
			get(); ++txt;
		}
		return true;
	}

	enum Tokens
	{
		T_begin_array = 0x5B,
		T_begin_object = 0x7B,
		T_end_array = 0x5D,
		T_end_object = 0x7D,
		
		T_name_separator = 0x3A,
		T_value_separator = 0x2C,
		
		T_space = 0x20,
		T_horizontal_tab = 0x09,
		T_new_line = 0x0A,
		T_carriage_return = 0x0D,
		
		T_quotation_mark = 0x22,
		T_escape = 0x5C,
		T_reverse_solidus = 0x5C,
		T_solidus = 0x2F,
		T_backspace = 0x62,
		T_form_feed = 0x66,
		T_line_feed = 0x6E,
		T_minus = 0x2D,
		T_tab = 0x74,
		T_decimal_point = 0x2E
	};

private:
	std::istream &_is;
	int _current;
	int _prev;
	int _line;
	int _pos;

};

class Query : protected Lexer
{
public:
	Query(std::istream &is, const Value *root) : Lexer(is), _root(root)
	{
	}

	std::string parseUnquotedKey()
	{
		std::stringstream ss;
		bool finished = false;
		while(!end() && !finished)
		{
			if (isChar())
			{
				ss << (char) C();
			}
			else
			{
				finished = true;
				if (C() == T_escape)
				{
					get();
					if (isChar())
					{
						ss << T_escape << (char)C();
						finished = false;
					}
				}
			}
			if (!finished) get();
		}
		return ss.str();
	}


	std::string parseKey()
	{
		ws();
		if (C() == T_quotation_mark)
		{
			get(); // consume -> "
			std::string s = parseUnquotedKey();
			if (C() == T_quotation_mark)
			{
				get(); // consume -> "
				return s;
			}
			else error("Expected quotation mark");
		}
		else
		{
			if (!isAlpha()) error("Expected valid key");
			else
			{
				std::stringstream ss;
				while(isAlpha() || isNumeric())
				{	
					ss << (char)C();
					get();
				}
				return ss.str();
			}
		}
		return "";
	}


	const Value* getValue()
	{
		const Value* current = _root;
		ws(); // ignore intial spaces
		bool firstToken = true;
		while(!end() && current)
		{
			if (current->isObject())
			{
				const Value::Object &obj = current->asObject();
				if ( /* the object access method is with the .(decimal_point), except
					  * if the first token is arealdy an object */
					(C() == T_decimal_point && !firstToken) || // or //
					/* the first token can begin without the . (decimal_point) */
					(isChar() && firstToken))
				{
					if (C() == T_decimal_point) get(); //consume "."
					std::string s = parseKey();
					if (obj.hasKey(s))
					{
						current = &obj[s];
					}
					else
					{
						current = 0;
					}
				}
				else if (C() == T_begin_array)
				{
					get(); // consume "["
					std::string s = parseKey();
					if (C() == T_end_array) // match "]"
					{
						get(); // consume "]"
						current = &obj[s];
					}
					else
					{
						error("expected [key]");
						return 0;;
					}
				}
				else
				{
					error("expected valid object accessor .key or [key]");
					return 0;;
				}
			}
			else if (current->isArray())
			{
				const Value::Array &array = current->asArray();
				if (C() != T_begin_array)
				{
					error("expected '[' for array");
					return 0;;
				}
				get(); // consume "["
				Value num = parseNumber();
				if (!num.valid())
				{
					error("expected valid index");
					return 0;;
				}
				size_t index = (size_t) num.asNumber();
				if (index > array.size())
				{
					error("invalid index");
					return 0;;
				}
				if (C() != T_end_array)
				{
					error("expected ']' for array");
					return 0;;
				}
				get(); // consume "]"
				current = &array[index];
			}
			else
			{
				// not an object, nor an array...
				error("Expected either object or array");
				return 0;;
			}
			ws(); // consume spaces
			firstToken = false;
		}
		return current;
	}


protected:
	const Value *_root;

};


void Value::write(std::ostream &out, bool prettyPrint, size_t padding) const
{
	switch(type())
	{
		case 0 /*null*/    : out << "null"; break;
		case 1 /*string*/  : out << '"' << asString().get() << '"'; break;
		case 2 /*number*/  : out << asNumber().get() ; break;
		case 3 /*object*/  :
			{
				const Value::T_Object &obj = asObject().get();
				out << "{";
				if (prettyPrint) out << std::endl; 
				{
					Value::T_Object::const_iterator i;
					bool useComma = false;
					for(i = obj.begin(); i != obj.end(); ++i)
					{
						if (i->second.valid())
						{
							if (useComma)
							{
								if (prettyPrint) out << ", " << std::endl;
								else out << ",";
							}
							else useComma = true;
							if (prettyPrint) for(size_t t = 0; t < padding+1; t++) out << "\t"; 
							out << '"' << i->first << '"' << ':';
							i->second.write(out, prettyPrint, padding+1);
						}
						else
						{
							//TODO: Here... We have an invalid key... which shouldn't be here
							// ... I should prevent using object[key] with no exisiting keys somehow...
						}
						
					}
				}
				if (prettyPrint)
				{
					out << std::endl;
					for(size_t t = 0; t < padding; t++) out << "\t"; 
				}
				out<< "}";
				break;
			}
		case 4 /*array*/ :
			{
				const Value::T_Array &vect = asArray().get();
				out << "[";
				if (prettyPrint) out << std::endl;
				{
					Value::T_Array::const_iterator i = vect.begin();
					bool useComma = false;
					for(;i != vect.end(); ++i)
					{
						if (i->valid())
						{
							if (useComma)
							{
								if (prettyPrint) out << ", " << std::endl;
								else out << ",";
							}
							else useComma = true;
							if (prettyPrint) for(size_t t = 0; t < padding+1; t++) out << "\t"; 
							i->write(out, prettyPrint, padding+1);
						}
					}
				}
				if (prettyPrint)
				{
					out << std::endl;
					for(size_t t = 0; t < padding; t++) out << "\t"; 
				}
				out << "]";
				break;
			}
		case 5 /*boolean*/ : out << (asBoolean().get()? "true" : "false"); break;
	}
}



void AbstractValueData::freeValue()
{
	// call to Object's destructor
	switch(type())
	{
		case 0: delete static_cast<Value::Null*>(this); break;
		case 1: delete static_cast<Value::String*>(this); break;
		case 2: delete static_cast<Value::Number*>(this); break;
		case 3: delete static_cast<Value::Object*>(this); break;
		case 4: delete static_cast<Value::Array*>(this); break;
		case 5: delete static_cast<Value::Boolean*>(this); break;
	}
}

Text::Text()
{
}

Text::~Text()
{
}

Value::Object& Text::initWithObject()
{
	_root = Value::createObject();
	return _root.asObject();
}

Value::Array& Text::initWithArray()
{
	_root = Value::createArray();
	return _root.asArray();
}

Value Value::parse(std::istream &is)
{
	Lexer lex(is);
	return lex.parseValue();
}

Value Value::parse(const std::string &s)
{
	std::stringstream stream(s);
	return parse(stream);
}

Value* Value::search(const std::string &s)
{
	std::stringstream ss(s);
	Query q(ss, this);
	return const_cast<Value*>(q.getValue());
}

const Value Value::query(const std::string &s) const
{
	std::stringstream ss(s);
	Query q(ss, this);
	const Value *ptr = q.getValue();
	if (ptr == 0) return Value();
	else return *ptr;
}

Value Value::clone()
{
	switch(type())
	{
		case 0: return Value(new Null(asNull())); break;
		case 1: return Value(new String(asString())); break;
		case 2: return Value(new Number(asNumber())); break;
		case 3: 
			{
				Object &from = asObject();
				Object *to = new Object();
				for(Object::iterator i = from.begin(); i != from.end(); ++i)
				{
					Value v = i->second.clone();
					(*to)[i->first] = v;
				}
				return Value(to);
			}
			break;
		case 4:
			{	Array &from = asArray();
				Array *to = new Array();
				for(Array::iterator i = from.begin(); i != from.end(); ++i)
				{
					Value v = i->clone();
					to->push_back(v);
				}
				return Value(to);	
			}
			break;
		case 5: return Value(new Boolean(asBoolean())); break;
	}
	return Value();
}

bool Text::initFromStream(std::istream &is)
{
	Lexer lex(is);
	Value root = lex.parseValue();
	if (root.valid())
	{
		if (root.isObject() || root.isArray()) _root = root;
		return true;
	}
	return false;
}

void Text::write(std::ostream &out, bool prettyPrint) const
{
	const Value& v = getRoot();
	if (v.valid()) v.write(out, prettyPrint, 0);
}

PJSON_NAMESPACE_END

