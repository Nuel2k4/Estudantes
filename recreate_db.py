"""
Script para recriar o banco de dados
Use quando adicionar novos campos aos modelos
"""
from app import db, app

def recreate_database():
    with app.app_context():
        print("🗑️  Removendo banco antigo...")
        db.drop_all()
        
        print("🏗️  Criando novo banco com todas as tabelas...")
        db.create_all()
        
        print("✅ Banco de dados recriado com sucesso!")
        print("")
        print("⚠️  ATENÇÃO: Todos os dados anteriores foram apagados!")
        print("📝 Você precisará criar uma nova conta.")

if __name__ == '__main__':
    recreate_database()
