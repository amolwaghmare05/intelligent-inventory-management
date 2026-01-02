import pandas as pd
from sklearn.linear_model import LinearRegression
import pickle

# Load sales data
df = pd.read_csv("sales_data.csv")

# Convert dates to numerical format for AI training
df["date"] = pd.to_datetime(df["date"])
df["date"] = df["date"].map(pd.Timestamp.toordinal)

# Train AI model
X = df[["date"]]
y = df["quantity"]
model = LinearRegression()
model.fit(X, y)

# Save trained model
with open("sales_model.pkl", "wb") as f:
    pickle.dump(model, f)

print("✅ AI Model Trained and Saved as sales_model.pkl")
